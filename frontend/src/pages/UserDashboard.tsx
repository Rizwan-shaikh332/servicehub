import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, LogOut, User, FileText, Wallet, Phone, Send, Clock, CheckCircle, XCircle, MessageSquare, AlertCircle, RefreshCw, History, CreditCard, TrendingUp, TrendingDown, RotateCcw, Calendar, BookOpen, Eye, EyeOff, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUserServices, submitServiceRequest, getUserRequests, refreshUserData, getPaymentHistory, submitLLRExam } from '../services/api';

interface UserData {
  id: string;
  name: string;
  mobile: string;
  walletBalance: number;
  isBlocked: boolean;
}

interface Service {
  _id: string;
  name: string;
  description: string;
  userPrice: number;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
  isActive: boolean;
}

interface ServiceRequest {
  _id: string;
  serviceName: string;
  servicePrice: number;
  status: string;
  adminMessage: string;
  createdAt: string;
  fieldData: any;
}

interface PaymentHistoryEntry {
  _id: string;
  transactionType: string; // 'credit', 'debit', 'refund'
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
  referenceId?: string;
}

const UserDashboard = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [userRequests, setUserRequests] = useState<ServiceRequest[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('services');
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      toast.error('Please login to access dashboard');
      navigate('/login');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchServices(parsedUser.id);
      fetchUserRequests(parsedUser.id);
      fetchPaymentHistory(parsedUser.id);
      
      // Auto-refresh user data every 30 seconds to sync with admin changes
      const refreshInterval = setInterval(() => {
        refreshUserDataSilently(parsedUser.id);
      }, 30000);

      return () => clearInterval(refreshInterval);
    } catch (error) {
      toast.error('Invalid session data');
      navigate('/login');
    }

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error('Right-click is disabled for security');
    };

    // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+Shift+C
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        toast.error('Developer tools are disabled for security');
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  const fetchServices = async (userId: string) => {
    try {
      const response = await getUserServices(userId);
      setServices(response.data.services);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Your account has been blocked. Please contact administrator.');
        handleLogout();
      } else {
        toast.error('Failed to fetch services');
      }
    }
  };

  const fetchUserRequests = async (userId: string) => {
    try {
      const response = await getUserRequests(userId);
      setUserRequests(response.data.requests);
    } catch (error) {
      toast.error('Failed to fetch your requests');
    }
  };

  const fetchPaymentHistory = async (userId: string) => {
    try {
      const response = await getPaymentHistory(userId);
      setPaymentHistory(response.data.history);
    } catch (error) {
      toast.error('Failed to fetch payment history');
    }
  };

  // Silent refresh without showing loading indicators
  const refreshUserDataSilently = async (userId: string) => {
    try {
      const response = await refreshUserData(userId);
      const updatedUser = response.data.user;
      
      // Update user state and localStorage
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Also refresh requests and payment history to check for updates
      fetchUserRequests(userId);
      fetchPaymentHistory(userId);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Your account has been blocked. Please contact administrator.');
        handleLogout();
      }
      // Don't show error for silent refresh
    }
  };

  // Manual refresh with loading indicator
  const handleManualRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      const response = await refreshUserData(user.id);
      const updatedUser = response.data.user;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Refresh all data
      await Promise.all([
        fetchServices(user.id),
        fetchUserRequests(user.id),
        fetchPaymentHistory(user.id)
      ]);
      
      toast.success('Data refreshed successfully!');
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Your account has been blocked. Please contact administrator.');
        handleLogout();
      } else {
        toast.error('Failed to refresh data');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const isLLRService = (service: Service) => {
    return service.name.toLowerCase().includes('llr') || 
           service.name.toLowerCase().includes('learner') ||
           service.name.toLowerCase().includes('license');
  };

  const handleServiceRequest = (service: Service) => {
    if (!user) return;
    
    if (service.userPrice <= 0) {
      toast.error('Service price not set for your account. Please contact administrator.');
      return;
    }
    
    if (user.walletBalance < service.userPrice) {
      toast.error('Insufficient wallet balance for this service');
      return;
    }
    
    setSelectedService(service);
    setFormData({
      // Set default values for LLR service
      type: 'day'
    });
    setShowServiceForm(true);
    setShowPassword(false);
  };

  const validateLLRData = () => {
    const errors = [];
    
    if (!formData.applno?.trim()) {
      errors.push();
    } else if (formData.applno.trim().length < 5) {
      errors.push();
    }
    
    if (!formData.dob?.trim()) {
      errors.push();
    }
    
    if (!formData.pass?.trim()) {
      errors.push();
    } else if (formData.pass.trim().length < 4) {
      errors.push();
    }
    
    return errors;
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !user) return;

    setLoading(true);
    try {
      let response;
      
      // Check if this is an LLR service
      if (isLLRService(selectedService)) {
        // Validate LLR specific fields
        const validationErrors = validateLLRData();
        if (validationErrors.length > 0) {
          toast.error(validationErrors[0]);
          setLoading(false);
          return;
        }

        // Submit LLR exam request with proper field mapping
        response = await submitLLRExam(
          user.id,
          selectedService._id,
          formData.applno.trim(),
          formData.dob.trim(),
          formData.pass.trim(),
          formData.pin?.trim() || '',
          formData.type || 'day'
        );
        
        toast.success(
          <div>
            <p className="font-semibold">LLR Exam submitted successfully!</p>
            <p className="text-sm">Token: {response.data.token}</p>
            <p className="text-sm">Queue: {response.data.queue}</p>
          </div>,
          { duration: 8000 }
        );
      } else {
        // Validate required fields for regular services
        const missingFields = selectedService.fields
          .filter(field => field.required && !formData[field.name]?.trim())
          .map(field => field.name);

        if (missingFields.length > 0) {
          toast.error(`Please fill required fields: ${missingFields.join(', ')}`);
          setLoading(false);
          return;
        }

        // Submit regular service request
        response = await submitServiceRequest(user.id, selectedService._id, formData);
        toast.success('Service request submitted successfully!');
      }
      
      // Update user wallet balance
      const updatedUser = { ...user, walletBalance: response.data.newWalletBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setShowServiceForm(false);
      setSelectedService(null);
      setFormData({});
      fetchUserRequests(user.id);
      fetchPaymentHistory(user.id); // Refresh payment history
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to submit request';
      
      // Show more helpful error messages for LLR
      if (isLLRService(selectedService)) {
        if (errorMessage.includes('not Matched')) {
          toast.error(
            <div>
              <p className="font-semibold">Application data doesn't match!</p>
              <p className="text-sm">Please verify your Application Number and Date of Birth are correct.</p>
            </div>,
            { duration: 6000 }
          );
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
      
      if (error.response?.status === 403) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'debit':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'refund':
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'bg-green-100 text-green-800';
      case 'debit':
        return 'bg-red-100 text-red-800';
      case 'refund':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get LLR specific form fields with exact API field names
  const getLLRFormFields = () => {
    return [
      {
        name: 'applno',
        type: 'text',
        required: true,
        placeholder: 'e.g., AP123456789',
        label: 'Application Number',
        description: 'Enter your LLR application number exactly as shown in your documents'
      },
      {
        name: 'dob',
        type: 'date',
        required: true,
        placeholder: 'Select your date of birth',
        label: 'Date of Birth',
        description: 'Must match the DOB in your LLR application'
      },
      {
        name: 'pass',
        type: 'text',
        required: true,
        placeholder: 'Enter password in CAPITAL LETTERS',
        label: 'Password',
        description: 'Password from your LLR application (will be converted to uppercase)'
      },
      {
        name: 'pin',
        type: 'text',
        required: false,
        placeholder: 'Enter exam PIN if available',
        label: 'Exam PIN (Optional)',
        description: 'Leave empty if you don\'t have an exam PIN'
      },
      {
        name: 'type',
        type: 'select',
        required: true,
        placeholder: 'Select exam type',
        label: 'Exam Type',
        description: 'Choose between day exam or night/quota limit exam',
        options: [
          { value: 'day', label: 'Day Exam (Regular)' },
          { value: 'night', label: 'Night/Quota Limit Exam' }
        ]
      }
    ];
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6" style={{ userSelect: 'none' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl p-4 sm:p-8 mb-6 sm:mb-8 border border-white/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-3 sm:p-4 rounded-2xl">
                <User className="w-8 sm:w-10 h-8 sm:h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-800">Welcome, {user.name}!</h1>
                <p className="text-gray-600 text-sm sm:text-lg">Your personalized service dashboard</p>
                <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-mono text-gray-700 flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {user.mobile}
                  </span>
                  <span className="bg-green-100 px-3 py-1 rounded-full text-sm font-semibold text-green-800 flex items-center">
                    <Wallet className="w-4 h-4 mr-1" />
                    ₹{user.walletBalance || 0}
                  </span>
                  {user.isBlocked && (
                    <span className="bg-red-100 px-3 py-1 rounded-full text-sm font-semibold text-red-800 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Account Blocked
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 bg-blue-100 hover:bg-blue-200 px-3 sm:px-4 py-2 rounded-xl transition-colors text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link 
                to="/" 
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 sm:px-4 py-2 rounded-xl transition-colors text-sm"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-700 px-3 sm:px-4 py-2 rounded-xl transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl mb-6 sm:mb-8 border border-white/20">
          <div className="flex space-x-1 p-2 overflow-x-auto">
            {[
              { id: 'services', label: 'Available Services', icon: FileText },
              { id: 'llr-status', label: 'LLR Exam', icon: BookOpen },
              { id: 'requests', label: 'My Requests', icon: MessageSquare },
              { id: 'history', label: 'Payment History', icon: History }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.id === 'llr-status' ? navigate('/llr-status') : setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-teal-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 sm:w-5 h-4 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Compact Wallet Balance Card */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-4 sm:p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 sm:p-3 rounded-xl backdrop-blur-sm">
                <Wallet className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-medium text-green-100">Wallet Balance</h3>
                <p className="text-xl sm:text-2xl font-bold">₹{user.walletBalance || 0}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm text-green-100">Available Funds</p>
              <p className="text-xs text-green-200">Contact admin to add funds</p>
            </div>
          </div>
        </div>

        {/* Available Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6 sm:space-y-8">
            {services.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Services Available</h3>
                <p className="text-gray-500">Please contact your administrator to set up services</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {services.map((service) => (
                  <div 
                    key={service._id}
                    className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl p-6 sm:p-8 border border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                  >
                    <div className={`w-12 sm:w-16 h-12 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 ${
                      isLLRService(service) ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      {isLLRService(service) ? (
                        <BookOpen className="w-6 sm:w-8 h-6 sm:h-8 text-orange-600" />
                      ) : (
                        <FileText className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600" />
                      )}
                    </div>
                    
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">{service.name}</h3>
                    <p className="text-gray-600 mb-4 text-sm sm:text-base">{service.description}</p>
                    
                    {isLLRService(service) && (
                      <div className="mb-4 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs text-orange-700 font-medium">🚗 Learner's License Exam Service</p>
                        <p className="text-xs text-orange-600"></p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <div>
                        <p className="text-gray-600 text-sm mb-1">Your Price</p>
                        <p className="text-2xl sm:text-4xl font-bold text-gray-800">₹{service.userPrice}</p>
                      </div>
                      <div className={`p-2 sm:p-3 rounded-xl ${
                        isLLRService(service) 
                          ? 'bg-gradient-to-br from-orange-500 to-red-600' 
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      }`}>
                        {isLLRService(service) ? (
                          <BookOpen className="w-4 sm:w-6 h-4 sm:h-6 text-white" />
                        ) : (
                          <FileText className="w-4 sm:w-6 h-4 sm:h-6 text-white" />
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-4 sm:mb-6">
                      <p className="text-sm text-gray-600 mb-2">Required Information:</p>
                      <div className="space-y-1">
                        {isLLRService(service) ? (
                          getLLRFormFields().map((field, index) => (
                            <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center justify-between">
                              <span>{field.label}</span>
                              {field.required && <span className="text-red-500">*</span>}
                            </div>
                          ))
                        ) : (
                          service.fields.map((field, index) => (
                            <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center justify-between">
                              <span>{field.name}</span>
                              {field.required && <span className="text-red-500">*</span>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleServiceRequest(service)}
                      disabled={user.walletBalance < service.userPrice || service.userPrice <= 0}
                      className={`w-full py-3 px-4 rounded-xl font-semibold transition-all text-sm sm:text-base ${
                        user.walletBalance >= service.userPrice && service.userPrice > 0
                          ? isLLRService(service)
                            ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white transform hover:-translate-y-0.5 hover:shadow-lg'
                            : 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white transform hover:-translate-y-0.5 hover:shadow-lg'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {service.userPrice <= 0 ? (
                        'Price Not Set'
                      ) : user.walletBalance >= service.userPrice ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Send className="w-4 h-4" />
                          <span>{isLLRService(service) ? 'Book LLR Exam' : 'Request Service'}</span>
                        </div>
                      ) : (
                        'Insufficient Balance'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Compact Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <MessageSquare className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Total</h3>
                <p className="text-lg sm:text-xl font-bold">{userRequests.length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <Clock className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Pending</h3>
                <p className="text-lg sm:text-xl font-bold">{userRequests.filter(r => r.status === 'pending').length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-3 sm:p-4 rounded-xl shadow-lg col-span-2 lg:col-span-1">
                <CheckCircle className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Completed</h3>
                <p className="text-lg sm:text-xl font-bold">{userRequests.filter(r => r.status === 'success').length}</p>
              </div>
            </div>

            {/* Compact Requests List */}
            <div className="space-y-3">
              {userRequests.map((request) => (
                <div key={request._id} className="bg-white/70 backdrop-blur-lg rounded-xl shadow-lg p-3 sm:p-4 border border-white/20">
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{request.serviceName}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    {/* Show submitted data */}
                    {Object.keys(request.fieldData).length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Submitted Information:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(request.fieldData).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="font-medium text-gray-600">{key}:</span>
                              <span className="ml-2 text-gray-800 break-words">{value as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {request.adminMessage && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-800 mb-1">Admin Message:</p>
                        <p className="text-blue-700 text-sm">{request.adminMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {userRequests.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Requests Yet</h3>
                  <p className="text-gray-500">Start by requesting a service from the Available Services tab</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Payment History Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <TrendingUp className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Credits</h3>
                <p className="text-lg sm:text-xl font-bold">{paymentHistory.filter(h => h.transactionType === 'credit').length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <TrendingDown className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Debits</h3>
                <p className="text-lg sm:text-xl font-bold">{paymentHistory.filter(h => h.transactionType === 'debit').length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <RotateCcw className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Refunds</h3>
                <p className="text-lg sm:text-xl font-bold">{paymentHistory.filter(h => h.transactionType === 'refund').length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <History className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Total</h3>
                <p className="text-lg sm:text-xl font-bold">{paymentHistory.length}</p>
              </div>
            </div>

            {/* Payment History List */}
            <div className="space-y-3">
              {paymentHistory.map((entry) => (
                <div key={entry._id} className="bg-white/70 backdrop-blur-lg rounded-xl shadow-lg p-3 sm:p-4 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(entry.transactionType)}
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{entry.description}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionColor(entry.transactionType)}`}>
                          {entry.transactionType.charAt(0).toUpperCase() + entry.transactionType.slice(1)}
                        </span>
                        <span className={`font-bold text-sm sm:text-base ${
                          entry.transactionType === 'debit' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {entry.transactionType === 'debit' ? '-' : '+'}₹{entry.amount}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Balance: ₹{entry.balanceAfter}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {paymentHistory.length === 0 && (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Payment History</h3>
                  <p className="text-gray-500">Your payment transactions will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Request Modal */}
        {showServiceForm && selectedService && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                {isLLRService(selectedService) ? 'Book LLR Exam' : `Request ${selectedService.name}`}
              </h3>
              
              {isLLRService(selectedService) && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  {/* <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-orange-800 font-medium">🚗 Important: LLR Exam Booking</p>
                      <p className="text-xs text-orange-600 mt-1">
                        Make sure your Application Number and Date of Birth exactly match.
                      </p>
                    </div>
                  </div> */}
                </div>
              )}
              
              <div className="mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-blue-800 text-sm sm:text-base">Service Price</span>
                  <span className="text-lg sm:text-xl font-bold text-blue-900">₹{selectedService.userPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">Your Wallet Balance</span>
                  <span className="text-sm font-semibold text-blue-700">₹{user.walletBalance}</span>
                </div>
              </div>
              
              <form onSubmit={handleSubmitRequest}>
                <div className="space-y-4 mb-6">
                  {isLLRService(selectedService) ? (
                    // Use LLR specific fields
                    getLLRFormFields().map((field, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.description && (
                          <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                        )}
                        {field.type === 'select' ? (
                          <select
                            value={formData[field.name] || 'day'}
                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                            required={field.required}
                          >
                            {field.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.name === 'pass' ? (
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value.toUpperCase() })}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base font-mono"
                              placeholder={field.placeholder}
                              required={field.required}
                              style={{ textTransform: 'uppercase' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        ) : (
                          <input
                            type={field.type}
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                            placeholder={field.placeholder}
                            required={field.required}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    // Use service defined fields for regular services
                    selectedService.fields.map((field, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.name}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm sm:text-base"
                          placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
                          required={field.required}
                        />
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 text-sm sm:text-base ${
                      isLLRService(selectedService)
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                    }`}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{isLLRService(selectedService) ? 'Book Exam' : 'Submit Request'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowServiceForm(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-6 sm:mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <User className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-blue-800 mb-2 text-sm sm:text-base">Account Information</h4>
              <p className="text-blue-700 mb-2 text-sm">
                Your pricing is personalized and may differ from other users. 
                Use your wallet balance to pay for services. For LLR exams, you'll receive a token to track status and download certificates.
              </p>
              <p className="text-blue-600 text-xs sm:text-sm">
                Data auto-refreshes every 30 seconds. Use the refresh button for immediate updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;