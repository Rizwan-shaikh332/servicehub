import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download, Clock, CheckCircle, XCircle, AlertCircle, FileText, RotateCcw, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkLLRStatus, downloadLLRPdf, getUserLLRTokens } from '../services/api';

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

interface StatusResponse {
  success: boolean;
  status: string;
  message: string;
  queue?: string;
  remarks?: string;
  filename?: string;
  pdfAvailable: boolean;
}

const LLRStatusCheck = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState('');
  const [statusResponse, setStatusResponse] = useState<StatusResponse | null>(null);
  const [userTokens, setUserTokens] = useState<LLRToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [liveStatusUpdates, setLiveStatusUpdates] = useState<{[key: string]: any}>({});
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
    } catch (error) {
      toast.error('Invalid session data');
      navigate('/login');
    }
  }, [navigate]);

  // Auto-refresh functionality with live status updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && user) {
      interval = setInterval(() => {
        fetchUserTokens(user.id, true);
        checkLiveStatusForProcessingTokens();
      }, 5000); // Check every 5 seconds for live updates
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, user, userTokens]);

  // Live status callback function
  const checkLiveStatusForProcessingTokens = useCallback(async () => {
    const processingTokens = userTokens.filter(
      token => token.status === 'processing' || token.status === 'submitted'
    );

    for (const token of processingTokens) {
      try {
        const response = await checkLLRStatus(token.token);
        const statusData = response.data;
        
        // Update live status for this token
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

        // Update the token in our local state if status changed
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
        // Silent operation for live updates
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
      if (!silent) {
        console.error('Failed to fetch user tokens:', error);
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  const getStatusFromApiResponse = (apiStatus: string) => {
    switch (apiStatus) {
      case '200': return 'completed';
      case '500': return 'processing';
      case '300': return 'refunded';
      case '404': return 'failed';
      default: return 'submitted';
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error('Please enter a valid token');
      return;
    }

    setLoading(true);
    try {
      const response = await checkLLRStatus(token.trim());
      setStatusResponse(response.data);
      
      // Update live status for this token
      setLiveStatusUpdates(prev => ({
        ...prev,
        [token.trim()]: {
          queue: response.data.queue,
          status: response.data.status,
          message: response.data.message,
          lastUpdated: new Date().toLocaleTimeString(),
          remarks: response.data.remarks
        }
      }));
      
      // Refresh user tokens to get updated status
      if (user) {
        fetchUserTokens(user.id);
      }
      
      // Show appropriate message based on status
      const status = response.data.status;
      if (status === '200') {
        toast.success('Exam completed successfully! PDF is ready for download.');
      } else if (status === '500') {
        toast.info(`Exam is under process. ${response.data.queue || ''}`);
      } else if (status === '300') {
        toast.error(`Exam was refunded: ${response.data.message}`);
      } else {
        toast.error(response.data.message || 'Status check failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to check status';
      toast.error(errorMessage);
      setStatusResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (tokenToDownload: string) => {
    setDownloading(tokenToDownload);
    try {
      const response = await downloadLLRPdf(tokenToDownload);
      
      if (response.data.success && response.data.pdfData) {
        // Create blob from base64 data
        const pdfData = response.data.pdfData.replace('data:application/pdf;base64,', '');
        const byteCharacters = atob(pdfData);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Create download link
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
        return 'bg-blue-100 text-blue-800 border-blue-200';
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

  // Get live status for a token
  const getLiveStatus = (token: string) => {
    return liveStatusUpdates[token];
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link 
                to="/dashboard" 
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">LLR Exam Status</h1>
                <p className="text-gray-600 text-sm sm:text-base">Check your Learner's License exam status and download certificates</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
              <FileText className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Status Check Form */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-6 border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Check Exam Status
          </h2>
          
          <form onSubmit={handleCheckStatus} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Enter your exam token (e.g., APPNOEXAM_17454554454)"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check Status</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Status Response */}
        {statusResponse && (
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Status Response</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  {statusResponse.status === '200' && <CheckCircle className="w-6 h-6 text-green-600" />}
                  {statusResponse.status === '500' && <Clock className="w-6 h-6 text-yellow-600" />}
                  {statusResponse.status === '300' && <RotateCcw className="w-6 h-6 text-blue-600" />}
                  {statusResponse.status === '404' && <XCircle className="w-6 h-6 text-red-600" />}
                  
                  <div>
                    <p className="font-semibold text-gray-900">
                      {statusResponse.status === '200' && 'Exam Completed Successfully'}
                      {statusResponse.status === '500' && 'Exam Under Process'}
                      {statusResponse.status === '300' && 'Exam Refunded'}
                      {statusResponse.status === '404' && 'Error'}
                    </p>
                    {statusResponse.queue && (
                      <p className="text-sm text-gray-600">{statusResponse.queue}</p>
                    )}
                  </div>
                </div>
                
                {statusResponse.pdfAvailable && (
                  <button
                    onClick={() => handleDownloadPdf(token)}
                    disabled={downloading === token}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {downloading === token ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {statusResponse.message && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800">{statusResponse.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LLR Exam Status Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
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
                  {autoRefresh && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
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
          
          {userTokens.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No LLR Exams Found</h3>
              <p className="text-gray-500">Your LLR exam requests will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Application & Service
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Live Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
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
                              <div className="text-sm font-medium text-gray-900">
                                {llrToken.applno}
                              </div>
                              <div className="text-sm text-gray-500">{llrToken.serviceName}</div>
                              {llrToken.applname && (
                                <div className="text-xs text-gray-400">{llrToken.applname}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(llrToken.status)}`}>
                              {getStatusText(llrToken.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(llrToken.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {liveStatus ? (
                              <div className="space-y-1">
                                {liveStatus.queue && (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-blue-700 font-medium">{liveStatus.queue}</span>
                                  </div>
                                )}
                                <div className="text-xs text-gray-500">
                                  Updated: {liveStatus.lastUpdated}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400">
                                {llrToken.queue || 'No live data'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-xs">
                            {liveStatus?.remarks || llrToken.remarks ? (
                              <div className="mb-1">{liveStatus?.remarks || llrToken.remarks}</div>
                            ) : null}
                            {llrToken.refundReason && (
                              <div className="text-yellow-700 bg-yellow-50 px-2 py-1 rounded text-xs">
                                Refund: {llrToken.refundReason}
                              </div>
                            )}
                            {llrToken.rtoname && (
                              <div className="text-xs text-gray-500">RTO: {llrToken.rtoname}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setToken(llrToken.token);
                                handleCheckStatus({ preventDefault: () => {} } as React.FormEvent);
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Check Status"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                            
                            {llrToken.status === 'completed' && (
                              <button
                                onClick={() => handleDownloadPdf(llrToken.token)}
                                disabled={downloading === llrToken.token}
                                className="text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50"
                                title="Download PDF"
                              >
                                {downloading === llrToken.token ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 sm:mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <AlertCircle className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-blue-800 mb-2 text-sm sm:text-base">Live Status Information</h4>
              <div className="space-y-2 text-blue-700 text-sm">
                {/* <p><strong>Submitted:</strong> Your exam request has been submitted to the RTO system.</p> */}
                <p><strong>Processing:</strong> Your exam is in progress or queued for processing.</p>
                <p><strong>Completed:</strong> Your exam is complete and certificate is ready for download.</p>
                <p><strong>Refunded:</strong> Your exam was cancelled and amount has been refunded to your wallet.</p>
                <p><strong>Live Updates:</strong> Enable to get real-time queue position and status updates every 5 seconds.</p>
              </div>
              <p className="text-blue-600 text-xs sm:text-sm mt-3">
                Live updates show real-time queue positions and status changes. PDF downloads are only available for completed exams.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLRStatusCheck;