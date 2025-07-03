import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Admin APIs
export const adminLogin = (username: string, password: string) => {
  return api.post('/admin/login', { username, password });
};

export const getDashboardStats = () => {
  return api.get('/admin/dashboard-stats');
};

export const createUser = (name: string, mobile: string, password: string) => {
  return api.post('/admin/create-user', { name, mobile, password });
};

export const getAllUsers = () => {
  return api.get('/admin/users');
};

export const toggleUserStatus = (userId: string, isBlocked: boolean) => {
  return api.put('/admin/toggle-user-status', { userId, isBlocked });
};

export const setServicePrice = (userId: string, serviceId: string, price: number) => {
  return api.put('/admin/set-service-price', { userId, serviceId, price });
};

export const updateWallet = (userId: string, walletBalance: number) => {
  return api.put('/admin/update-wallet', { userId, walletBalance });
};

export const getUserServicePrices = (userId: string) => {
  return api.get(`/admin/user-service-prices/${userId}`);
};

// Service Management APIs
export const createService = (name: string, description: string, defaultPrice: number, fields: any[]) => {
  return api.post('/admin/services', { name, description, defaultPrice, fields });
};

export const getAllServices = () => {
  return api.get('/admin/services');
};

export const toggleServiceStatus = (serviceId: string, isActive: boolean) => {
  return api.put(`/admin/services/${serviceId}/toggle`, { isActive });
};

export const deleteService = (serviceId: string) => {
  return api.delete(`/admin/services/${serviceId}`);
};

export const getServiceRequests = () => {
  return api.get('/admin/service-requests');
};

export const respondToRequest = (requestId: string, status: string, adminMessage: string) => {
  return api.put(`/admin/service-request/${requestId}/respond`, { status, adminMessage });
};

// User APIs
export const loginUser = (mobile: string, password: string) => {
  return api.post('/auth/login', { mobile, password });
};

export const getUserProfile = (userId: string) => {
  return api.get(`/user/profile/${userId}`);
};

// NEW API: Refresh user data
export const refreshUserData = (userId: string) => {
  return api.get(`/user/refresh/${userId}`);
};

export const getUserServices = (userId: string) => {
  return api.get(`/user/services/${userId}`);
};

export const submitServiceRequest = (userId: string, serviceId: string, fieldData: any) => {
  return api.post('/user/service-request', { userId, serviceId, fieldData });
};

export const getUserRequests = (userId: string) => {
  return api.get(`/user/service-requests/${userId}`);
};

// NEW API: Get payment history
export const getPaymentHistory = (userId: string) => {
  return api.get(`/user/payment-history/${userId}`);
};

// LLR Service APIs
export const submitLLRExam = (userId: string, serviceId: string, applno: string, dob: string, pass: string, pin?: string, type?: string) => {
  return api.post('/llr/submit-exam', { userId, serviceId, applno, dob, pass, pin, type });
};

export const checkLLRStatus = (token: string) => {
  return api.post('/llr/check-status', { token });
};

export const downloadLLRPdf = (token: string) => {
  return api.post('/llr/download-pdf', { token });
};

export const getUserLLRTokens = (userId: string) => {
  return api.get(`/llr/user-tokens/${userId}`);
};

export default api;