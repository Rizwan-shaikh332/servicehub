import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Clock, CheckCircle, XCircle, AlertCircle, FileText, RotateCcw, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkLLRStatus, downloadLLRPdf, getUserLLRTokens, submitLLRExam, getUserServices } from '../services/api';

interface UserData {
  id: string;
  name: string;
  mobile: string;
  walletBalance: number;
  isBlocked: boolean;
}

interface LLRToken {
  _id: string;
  token: string;
  applno: string;
  applname: string;
  serviceName: string;
  servicePrice: number;
  status: string;
  queue?: string;
  rtoname?: string;
  remarks?: string;
  createdAt: string;
  completedAt?: string;
  filename?: string;
  refundReason?: string;
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

const LLRStatusCheck = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [userTokens, setUserTokens] = useState<LLRToken[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [liveStatusUpdates, setLiveStatusUpdates] = useState<{ [key: string]: any }>({});
  const [inputData, setInputData] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [llrService, setLlrService] = useState<Service | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      toast.error('Please login to access this page');
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchUserTokens(parsedUser.id);
      fetchLLRServices(parsedUser.id);
    } catch (error) {
      toast.error('Invalid session data');
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && user) {
      interval = setInterval(() => {
        fetchUserTokens(user.id, true);
        checkLiveStatusForProcessingTokens();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, user, userTokens]);

  const fetchLLRServices = async (userId: string) => {
    try {
      const response = await getUserServices(userId);
      const llrServices = response.data.services.filter((service: Service) => 
        service.name.toLowerCase().includes('llr') || 
        service.name.toLowerCase().includes('learner') ||
        service.name.toLowerCase().includes('license')
      );
      setServices(llrServices);
      if (llrServices.length > 0) {
        setLlrService(llrServices[0]);
      }
    } catch (error) {
      console.error('Failed to fetch LLR services:', error);
    }
  };

  const checkLiveStatusForProcessingTokens = useCallback(async () => {
    const processingTokens = userTokens.filter(
      token => token.status === 'processing' || token.status === 'submitted'
    );
    for (const token of processingTokens) {
      try {
        const response = await checkLLRStatus(token.token);
        const statusData = response.data;
        setLiveStatusUpdates(prev => ({
          ...prev,
          [token.token]: {
            queue: statusData.queue,
            status: statusData.status,
            message: statusData.message,
            lastUpdated: new Date().toLocaleTimeString(),
            remarks: statusData.remarks
          }
        }));

        if (getStatusFromApiResponse(statusData.status) !== token.status) {
          setUserTokens(prev =>
            prev.map(t =>
              t.token === token.token
                ? {
                    ...t,
                    status: getStatusFromApiResponse(statusData.status),
                    queue: statusData.queue,
                    remarks: statusData.remarks
                  }
                : t
            )
          );
        }
      } catch (error) {
        console.log(`Live status check failed for token ${token.token}`);
      }
    }
  }, [userTokens]);

  const fetchUserTokens = useCallback(async (userId: string, silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const response = await getUserLLRTokens(userId);
      setUserTokens(response.data.tokens);
    } catch (error) {
      if (!silent) console.error('Failed to fetch user tokens:', error);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  const getStatusFromApiResponse = (apiStatus: string) => {
    switch (apiStatus) {
      case '200':
        return 'completed';
      case '500':
        return 'processing';
      case '300':
        return 'refunded';
      case '404':
        return 'failed';
      default:
        return 'submitted';
    }
  };

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!llrService || !user) {
      toast.error('LLR service not available');
      return;
    }

    // Parse the input data by lines
    const lines = inputData.split('\n').map(line => line.trim());
    const [applno, dob, pass] = lines;

    if (!applno) {
      toast.error('Application Number is required (first line)');
      return;
    }
    if (!dob) {
      toast.error('Date of Birth is required (second line)');
      return;
    }
    if (!pass) {
      toast.error('Password is required (third line)');
      return;
    }

    if (user.walletBalance < llrService.userPrice) {
      toast.error('Insufficient wallet balance for this service');
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitLLRExam(
        user.id,
        llrService._id,
        applno,
        dob,
        pass,
        '', // PIN is optional
        'day'
      );
      
      toast.success('LLR Exam submitted successfully!');
      setInputData('');
      fetchUserTokens(user.id);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to submit exam request';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async (tokenToDownload: string) => {
    setDownloading(tokenToDownload);
    try {
      const response = await downloadLLRPdf(tokenToDownload);
      if (response.data.success && response.data.pdfData) {
        const pdfData = response.data.pdfData.replace('data:application/pdf;base64,', '');
        const byteCharacters = atob(pdfData);
        const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || 'llr_certificate.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success('PDF downloaded successfully!');
      } else {
        toast.error('Failed to download PDF');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to download PDF';
      toast.error(errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'refunded':
        return <RotateCcw className="w-5 h-5 text-blue-600" />;
      case 'submitted':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'refunded':
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'refunded':
        return 'Refunded';
      case 'submitted':
        return 'Submitted';
      default:
        return 'Failed';
    }
  };

  const getLiveStatus = (token: string) => liveStatusUpdates[token];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-4 sm:p-6 mb-6 border border-white/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="bg-gray-100 hover:bg-gray-200 p-2 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">LLR Exam Center</h1>
                <p className="text-gray-600 text-sm sm:text-base">Enter your details and submit exam request</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl">
              <FileText className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl shadow-xl p-6 sm:p-8 mb-8 border border-white/30">
          {/* <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-2">
              Exam submission will close after
            </h2>
            <div className="text-lg sm:text-xl font-semibold text-blue-700 mb-1">
              7 hrs 44 mins 46 secs
            </div>
            <div className="text-lg font-bold text-blue-900">
              Sharp 11:00 PM
            </div>
          </div> */}

          {/* Simplified Textarea Form */}
          <form onSubmit={handleSubmitExam} className="space-y-4">
            <div>
              <label htmlFor="llrData" className="block text-sm font-medium text-gray-600 mb-1">
                Enter your details (one piece per line):
              </label>
              <textarea
                id="llrData"
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg h-32"
                placeholder={`Application Number\nDate of Birth (DD-MM-YYYY)\nPassword`}
                required
              />
            </div>

            {/* Exam Charges and Wallet Balance */}
            <div className="flex justify-between items-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 text-center border-2 border-white/50">
                <span className="text-lg font-bold text-gray-700">
                  Exam Charges: ₹{llrService?.userPrice || 0}
                </span>
              </div>
              <div className="bg-green-100 rounded-2xl p-3 text-center">
                <span className="text-sm text-green-700">
                  Wallet: <span className="font-bold">₹{user.walletBalance}</span>
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !llrService || user.walletBalance < (llrService?.userPrice || 0)}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                submitting || !llrService || user.walletBalance < (llrService?.userPrice || 0)
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </form>
        </div>

        {/* LLR Exam Status Table */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/30">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Your LLR Exam History
              </h2>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="autoRefresh" className="text-sm font-medium text-gray-700">
                    Live Updates
                  </label>
                  {autoRefresh && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
                </div>
                <button
                  onClick={() => user && fetchUserTokens(user.id)}
                  disabled={refreshing}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application & Service</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Live Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userTokens.map((llrToken) => {
                  const liveStatus = getLiveStatus(llrToken.token);
                  return (
                    <tr key={llrToken._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(llrToken.status)}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{llrToken.applno}</div>
                            <div className="text-sm text-gray-500">{llrToken.serviceName}</div>
                            {llrToken.applname && <div className="text-xs text-gray-400">{llrToken.applname}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(llrToken.status)}`}>
                          {getStatusText(llrToken.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(llrToken.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {liveStatus ? (
                          <div>
                            {liveStatus.queue && <span className="text-blue-700 font-medium">{liveStatus.queue}</span>}
                            <div className="text-xs text-gray-500">Updated: {liveStatus.lastUpdated}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">{llrToken.queue || 'No live data'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {liveStatus?.remarks || llrToken.remarks}
                        {llrToken.refundReason && (
                          <div className="text-yellow-700 bg-yellow-50 px-2 py-1 rounded text-xs mt-1">
                            Refund: {llrToken.refundReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {llrToken.status === 'completed' && (
                          <button
                            onClick={() => handleDownloadPdf(llrToken.token)}
                            disabled={downloading === llrToken.token}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                          >
                            {downloading === llrToken.token ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {userTokens.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No LLR Exams Yet</h3>
                <p className="text-gray-500">Submit your first LLR exam using the form above</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLRStatusCheck;