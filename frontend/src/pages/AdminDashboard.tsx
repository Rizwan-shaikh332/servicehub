import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, DollarSign, Home, Settings, Wallet, LogOut, Phone, FileText, MessageSquare, CheckCircle, XCircle, Clock, Eye, ToggleLeft, ToggleRight, Shield, ShieldOff, TrendingUp, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { createUser, getAllUsers, updateWallet, createService, getAllServices, toggleServiceStatus, deleteService, getServiceRequests, respondToRequest, getUserServicePrices, setServicePrice, toggleUserStatus, getDashboardStats } from '../services/api';

interface User {
  _id: string;
  name: string;
  mobile: string;
  walletBalance: number;
  isBlocked: boolean;
}

interface Service {
  _id: string;
  name: string;
  description: string;
  defaultPrice: number;
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
  userName: string;
  userMobile: string;
  serviceName: string;
  servicePrice: number;
  fieldData: any;
  status: string;
  adminMessage: string;
  createdAt: string;
}

interface ServicePrice {
  serviceId: string;
  serviceName: string;
  price: number;
}

interface DashboardStats {
  todayRequests: number;
  todayAmount: number;
  totalRequests: number;
  totalUsers: number;
  totalServices: number;
  pendingRequests: number;
  successRequests: number;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  // User management states
  const [newUserName, setNewUserName] = useState('');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userServicePrices, setUserServicePrices] = useState<ServicePrice[]>([]);
  
  // Service management states
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState(0);
  const [serviceFields, setServiceFields] = useState([{ name: '', type: 'text', required: true, placeholder: '' }]);
  
  // Request management states
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [responseStatus, setResponseStatus] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem('admin');
    if (!adminData) {
      toast.error('Please login as admin to access dashboard');
      navigate('/admin-login');
      return;
    }
    
    // Log admin data for debugging
    console.log('Admin data found:', adminData);
    
    // Fetch initial data
    fetchDashboardStats();
    fetchUsers();
    fetchServices();
    fetchServiceRequests();
  }, [navigate]);

  const fetchDashboardStats = async () => {
    try {
      const response = await getDashboardStats();
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to fetch dashboard statistics');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getAllUsers();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const fetchServices = async () => {
    try {
      const response = await getAllServices();
      setServices(response.data.services);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to fetch services');
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const response = await getServiceRequests();
      setServiceRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching service requests:', error);
      toast.error('Failed to fetch service requests');
    }
  };

  const fetchUserServicePrices = async (userId: string) => {
    try {
      const response = await getUserServicePrices(userId);
      setUserServicePrices(response.data.servicePrices);
    } catch (error) {
      toast.error('Failed to fetch user service prices');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin');
    toast.success('Logged out successfully');
    navigate('/admin-login');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserMobile.trim() || !newUserPassword.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    if (!/^\d{10}$/.test(newUserMobile)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await createUser(newUserName, newUserMobile, newUserPassword);
      const newUser = response.data.user;
      
      toast.success(
        <div>
          <p className="font-semibold">User created successfully!</p>
          <p className="text-sm">Mobile: <span className="font-mono bg-gray-100 px-1 rounded">{newUser.mobile}</span></p>
          <p className="text-sm">Password: <span className="font-mono bg-gray-100 px-1 rounded">{newUser.password}</span></p>
        </div>,
        { duration: 8000 }
      );
      
      setNewUserName('');
      setNewUserMobile('');
      setNewUserPassword('');
      setShowCreateForm(false);
      fetchUsers();
      fetchDashboardStats();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !serviceDescription.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    const validFields = serviceFields.filter(field => field.name.trim());
    if (validFields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    setLoading(true);
    try {
      await createService(serviceName, serviceDescription, defaultPrice, validFields);
      toast.success('Service created successfully!');
      
      setServiceName('');
      setServiceDescription('');
      setDefaultPrice(0);
      setServiceFields([{ name: '', type: 'text', required: true, placeholder: '' }]);
      setShowServiceForm(false);
      fetchServices();
      fetchDashboardStats();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create service';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleService = async (serviceId: string, isActive: boolean) => {
    try {
      await toggleServiceStatus(serviceId, !isActive);
      toast.success(`Service ${!isActive ? 'activated' : 'deactivated'} successfully!`);
      fetchServices();
    } catch (error) {
      toast.error('Failed to update service status');
    }
  };

  const handleToggleUser = async (userId: string, isBlocked: boolean) => {
    try {
      await toggleUserStatus(userId, !isBlocked);
      toast.success(`User ${!isBlocked ? 'blocked' : 'unblocked'} successfully!`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await deleteService(serviceId);
      toast.success('Service deleted successfully!');
      fetchServices();
      fetchDashboardStats();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleRespondToRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !responseStatus) {
      toast.error('Please select status');
      return;
    }

    setLoading(true);
    try {
      await respondToRequest(selectedRequest._id, responseStatus, adminMessage);
      toast.success('Response sent successfully!');
      
      setShowResponseForm(false);
      setSelectedRequest(null);
      setResponseStatus('');
      setAdminMessage('');
      fetchServiceRequests();
      fetchDashboardStats();
    } catch (error) {
      toast.error('Failed to send response');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServicePrice = async (serviceId: string, price: number) => {
    if (!selectedUser) return;

    try {
      await setServicePrice(selectedUser._id, serviceId, price);
      toast.success('Service price updated successfully!');
      fetchUserServicePrices(selectedUser._id);
    } catch (error) {
      toast.error('Failed to update service price');
    }
  };

  const addServiceField = () => {
    setServiceFields([...serviceFields, { name: '', type: 'text', required: true, placeholder: '' }]);
  };

  const removeServiceField = (index: number) => {
    if (serviceFields.length > 1) {
      setServiceFields(serviceFields.filter((_, i) => i !== index));
    }
  };

  const updateServiceField = (index: number, field: string, value: any) => {
    const updatedFields = [...serviceFields];
    updatedFields[index] = { ...updatedFields[index], [field]: value };
    setServiceFields(updatedFields);
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

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
                <Settings className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-gray-600 text-sm sm:text-base">Manage users, services, and requests</p>
              </div>
            </div>
            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              <Link 
                to="/" 
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 text-red-700 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Today's Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4 sm:p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-6 h-6" />
                <span className="text-xs sm:text-sm opacity-80">Today</span>
              </div>
              <h3 className="text-sm sm:text-lg font-bold mb-1">Requests</h3>
              <p className="text-xl sm:text-2xl font-bold">{dashboardStats.todayRequests}</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 sm:p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6" />
                <span className="text-xs sm:text-sm opacity-80">Today</span>
              </div>
              <h3 className="text-sm sm:text-lg font-bold mb-1">Revenue</h3>
              <p className="text-xl sm:text-2xl font-bold">₹{dashboardStats.todayAmount}</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-violet-600 text-white p-4 sm:p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <span className="text-xs sm:text-sm opacity-80">Total</span>
              </div>
              <h3 className="text-sm sm:text-lg font-bold mb-1">Total Requests</h3>
              <p className="text-xl sm:text-2xl font-bold">{serviceRequests.length}</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 sm:p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <span className="text-xs sm:text-sm opacity-80">Total</span>
              </div>
              <h3 className="text-sm sm:text-lg font-bold mb-1">Pending</h3>
              <p className="text-xl sm:text-2xl font-bold">{serviceRequests.filter(r => r.status === 'pending').length}</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl mb-6 sm:mb-8 border border-white/20">
          <div className="flex space-x-1 p-2 overflow-x-auto">
            {[
              { id: 'requests', label: 'Service Requests', icon: MessageSquare },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'services', label: 'Service Management', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 sm:w-5 h-4 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <MessageSquare className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Total Requests</h3>
                <p className="text-lg sm:text-xl font-bold">{serviceRequests.length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <Clock className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Pending</h3>
                <p className="text-lg sm:text-xl font-bold">{serviceRequests.filter(r => r.status === 'pending').length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <CheckCircle className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Success</h3>
                <p className="text-lg sm:text-xl font-bold">{serviceRequests.filter(r => r.status === 'success').length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-500 to-pink-600 text-white p-3 sm:p-4 rounded-xl shadow-lg">
                <XCircle className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
                <h3 className="text-xs sm:text-sm font-bold mb-1">Failed</h3>
                <p className="text-lg sm:text-xl font-bold">{serviceRequests.filter(r => r.status === 'failed').length}</p>
              </div>
            </div> 

            {/* Requests List */}
            <div className="space-y-3">
              {serviceRequests.map((request) => (
                <div key={request._id} className="bg-white/70 backdrop-blur-lg rounded-xl shadow-lg p-3 sm:p-4 border border-white/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{request.serviceName}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{request.userName} • {request.userMobile}</p>
                        <p className="text-xs text-gray-500 sm:hidden">₹{request.servicePrice} • {new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full sm:w-auto space-x-4">
                      <div className="text-right hidden sm:block">
                        <p className="font-semibold text-gray-800">₹{request.servicePrice}</p>
                        <p className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRequestDetails(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-colors flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        
                        {request.status === 'pending' && (
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowResponseForm(true);
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-colors"
                          >
                            Respond
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {serviceRequests.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Service Requests</h3>
                  <p className="text-gray-500">Service requests will appear here when users submit them</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <Plus className="w-6 sm:w-8 h-6 sm:h-8 mb-3" />
                <h3 className="text-lg sm:text-xl font-bold mb-2">Create New User</h3>
                <p className="text-green-100 text-sm sm:text-base">Add a new user with mobile number and password</p>
              </button>

              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4 sm:p-6 rounded-2xl shadow-lg">
                <Users className="w-6 sm:w-8 h-6 sm:h-8 mb-3" />
                <h3 className="text-lg sm:text-xl font-bold mb-2">Total Users</h3>
                <p className="text-2xl sm:text-3xl font-bold">{users.length}</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">User Management</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-medium text-gray-900 text-sm">{user.name}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm">{user.mobile}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            ₹{user.walletBalance || 0}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {user.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setWalletBalance(user.walletBalance || 0);
                                setShowWalletForm(true);
                              }}
                              className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1"
                            >
                              <Wallet className="w-3 h-3" />
                              <span>Wallet</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                fetchUserServicePrices(user._id);
                                setShowPriceForm(true);
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Prices</span>
                            </button>
                            
                            <button
                              onClick={() => handleToggleUser(user._id, user.isBlocked)}
                              className={`px-2 sm:px-3 py-1 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 ${
                                user.isBlocked 
                                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                                  : 'bg-red-500 hover:bg-red-600 text-white'
                              }`}
                            >
                              {user.isBlocked ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                              <span className="hidden sm:inline">{user.isBlocked ? 'Unblock' : 'Block'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <button
                onClick={() => setShowServiceForm(true)}
                className="bg-gradient-to-br from-purple-500 to-violet-600 text-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <Plus className="w-6 sm:w-8 h-6 sm:h-8 mb-3" />
                <h3 className="text-lg sm:text-xl font-bold mb-2">Create New Service</h3>
                <p className="text-purple-100 text-sm sm:text-base">Add a new service with default pricing</p>
              </button>

              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 sm:p-6 rounded-2xl shadow-lg">
                <FileText className="w-6 sm:w-8 h-6 sm:h-8 mb-3" />
                <h3 className="text-lg sm:text-xl font-bold mb-2">Total Services</h3>
                <p className="text-2xl sm:text-3xl font-bold">{services.length}</p>
              </div>
            </div>

            {/* Services Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {services.map((service) => (
                <div key={service._id} className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 border border-white/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-purple-100 p-3 rounded-xl">
                      <FileText className="w-5 sm:w-6 h-5 sm:h-6 text-purple-600" />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleService(service._id, service.isActive)}
                        className={`p-2 rounded-lg transition-colors ${
                          service.isActive 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {service.isActive ? <ToggleRight className="w-4 sm:w-5 h-4 sm:h-5" /> : <ToggleLeft className="w-4 sm:w-5 h-4 sm:h-5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteService(service._id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-2"
                      >
                        <XCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{service.name}</h3>
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">{service.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Default Price</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-800">₹{service.defaultPrice}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-2">Required Fields:</p>
                    <div className="space-y-1">
                      {service.fields.map((field, index) => (
                        <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {field.name} ({field.type})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        {/* Create User Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Create New User</h3>
              <form onSubmit={handleCreateUser}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">User Name</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter user name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={newUserMobile}
                        onChange={(e) => setNewUserMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Enter 10-digit mobile number"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter password for user"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {loading ? 'Creating...' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Service Modal */}
        {showServiceForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Create New Service</h3>
              <form onSubmit={handleCreateService}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter service name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter service description"
                      rows={3}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Price (₹)</label>
                    <input
                      type="number"
                      value={defaultPrice}
                      onChange={(e) => setDefaultPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter default price for all users"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-sm text-gray-500 mt-1">This price will be assigned to all users initially</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Fields</label>
                    {serviceFields.map((field, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4 mb-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateServiceField(index, 'name', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            placeholder="Field name"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => updateServiceField(index, 'type', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="tel">Phone</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={field.placeholder}
                          onChange={(e) => updateServiceField(index, 'placeholder', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-3 text-sm"
                          placeholder="Placeholder text"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateServiceField(index, 'required', e.target.checked)}
                              className="mr-2"
                            />
                            Required field
                          </label>
                          {serviceFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeServiceField(index)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addServiceField}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors text-sm"
                    >
                      + Add Field
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {loading ? 'Creating...' : 'Create Service'}
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

        {/* Request Details Modal */}
        {showRequestDetails && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Request Details</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Service Information</h4>
                  <p className="text-sm"><span className="font-medium">Service:</span> {selectedRequest.serviceName}</p>
                  <p className="text-sm"><span className="font-medium">Price:</span> ₹{selectedRequest.servicePrice}</p>
                  <p className="text-sm"><span className="font-medium">Date:</span> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                </div>
                
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">User Information</h4>
                  <p className="text-sm"><span className="font-medium">Name:</span> {selectedRequest.userName}</p>
                  <p className="text-sm"><span className="font-medium">Mobile:</span> {selectedRequest.userMobile}</p>
                </div>
                
                {Object.keys(selectedRequest.fieldData).length > 0 && (
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Submitted Data</h4>
                    {Object.entries(selectedRequest.fieldData).map(([key, value]) => (
                      <p key={key} className="text-sm break-words"><span className="font-medium">{key}:</span> {value as string}</p>
                    ))}
                  </div>
                )}
                
                {selectedRequest.adminMessage && (
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Admin Response</h4>
                    <p className="text-blue-700 text-sm">{selectedRequest.adminMessage}</p>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowRequestDetails(false)}
                className="w-full mt-6 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Response Modal */}
        {showResponseForm && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Respond to Request</h3>
              <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm sm:text-base">{selectedRequest.userName}</p>
                <p className="text-sm text-gray-600">{selectedRequest.serviceName}</p>
                <p className="text-sm text-gray-600">₹{selectedRequest.servicePrice}</p>
              </div>
              
              <form onSubmit={handleRespondToRequest}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={responseStatus}
                      onChange={(e) => setResponseStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      required
                    >
                      <option value="">Select status</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message (Optional)</label>
                    <textarea
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Enter message for user"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {loading ? 'Sending...' : 'Send Response'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResponseForm(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Wallet Modal */}
        {showWalletForm && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-md">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Update Wallet for {selectedUser.name}</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedUser) return;

                setLoading(true);
                try {
                  await updateWallet(selectedUser._id, walletBalance);
                  toast.success('Wallet balance updated successfully!');
                  setShowWalletForm(false);
                  setSelectedUser(null);
                  fetchUsers();
                } catch (error) {
                  toast.error('Failed to update wallet balance');
                } finally {
                  setLoading(false);
                }
              }}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Balance (₹)</label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={walletBalance}
                      onChange={(e) => setWalletBalance(Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                      min="0"
                      step="0.01"
                      placeholder="Enter wallet balance"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Current balance: ₹{selectedUser.walletBalance || 0}</p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {loading ? 'Updating...' : 'Update Wallet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWalletForm(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Service Prices Modal */}
        {showPriceForm && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Service Prices for {selectedUser.name}</h3>
              
              <div className="space-y-4 mb-6">
                {userServicePrices.map((servicePrice) => (
                  <div key={servicePrice.serviceId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm sm:text-base">{servicePrice.serviceName}</p>
                      <p className="text-sm text-gray-600">Current: ₹{servicePrice.price}</p>
                    </div>
                    <input
                      type="number"
                      value={servicePrice.price}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value);
                        setUserServicePrices(prev => 
                          prev.map(sp => 
                            sp.serviceId === servicePrice.serviceId 
                              ? { ...sp, price: newPrice }
                              : sp
                          )
                        );
                      }}
                      onBlur={() => handleUpdateServicePrice(servicePrice.serviceId, servicePrice.price)}
                      className="w-full sm:w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowPriceForm(false)}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;