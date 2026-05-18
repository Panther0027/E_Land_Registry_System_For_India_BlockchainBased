import api from './api';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  linkWallet: (data) => api.put('/auth/wallet', data),
};

export const propertyAPI = {
  register: (formData) =>
    api.post('/property/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getById: (id) => api.get(`/property/${id}`),
  getMyProperties: (params) => api.get('/property/owner/me', { params }),
  search: (params) => api.get('/property/search', { params }),
  transfer: (data) => api.post('/property/transfer', data),
  verify: (id, data) => api.post(`/property/verify/${id}`, data),
  reject: (id, data) => api.post(`/property/reject/${id}`, data),
  getPending: () => api.get('/property/pending/all'),
  getDisputed: () => api.get('/property/disputed/all'),
  resolveDispute: (id, data) => api.post(`/property/resolve/${id}`, data),
  raiseDispute: (id, data) => api.post(`/property/dispute/${id}`, data),
  getDashboardStats: () => api.get('/property/dashboard/stats'),
  getGovernmentStats: () => api.get('/property/government/stats'),
  getPublicStats: () => api.get('/property/stats/public'),
  getDocuments: () => api.get('/property/documents/all'),
  uploadDocument: (formData) =>
    api.post('/property/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  verifyBlockchain: (id) => api.get(`/property/${id}/blockchain`),
  downloadCertificate: (id) =>
    api.get(`/property/${id}/certificate`, { responseType: 'blob' }),
};

export const transactionAPI = {
  getByProperty: (propertyId) => api.get(`/transactions/${propertyId}`),
  getMine: () => api.get('/transactions/user/me'),
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};
