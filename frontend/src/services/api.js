import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Numbers API
export const numbersApi = {
  getAreaCodes: () => api.get('/numbers/area-codes'),
  searchNumbers: (areaCode, limit = 20) => api.get(`/numbers/search?areaCode=${areaCode}&limit=${limit}`),
  getAllNumbers: () => api.get('/numbers'),
  getNumbersWithGHLStatus: () => api.get('/numbers/with-ghl-status'),
  getNumber: (id) => api.get(`/numbers/${id}`),
  purchaseNumber: (data) => api.post('/numbers/purchase', data),
  quickPurchase: (areaCode, friendlyName) => api.post('/numbers/purchase-quick', { areaCode, friendlyName }),
  updateNumber: (id, data) => api.put(`/numbers/${id}`, data),
  releaseNumber: (id) => api.delete(`/numbers/${id}`),
  syncFromTwilio: () => api.post('/numbers/sync/twilio'),
  getStates: () => api.get('/numbers/states'),
  searchNumbersByState: (states) => api.post('/numbers/states/search', { states }),
  bulkPurchaseByState: (states) => api.post('/numbers/states/purchase', { states }),
  bulkRelease: (phoneNumbers) => api.post('/numbers/bulk-release', { phoneNumbers }),
  bulkPurchaseSetters: (users) => api.post('/numbers/setters/bulk-purchase', { users }),
};

// GHL API
export const ghlApi = {
  getUsers: () => api.get('/ghl/users'),
  getPhoneNumbers: () => api.get('/ghl/phone-numbers'),
  syncNumber: (data) => api.post('/ghl/sync-number', data),
  getAssignments: () => api.get('/ghl/assignments'),
  assignNumber: (data) => api.post('/ghl/assign', data),
  syncUsers: () => api.post('/ghl/sync/users'),
};

// Analytics API
export const analyticsApi = {
  getOverview: (days = 7) => {
    return api.get(`/analytics/overview?days=${days}`);
  },
  getNumberAnalytics: (phoneNumber, days = 7) => {
    return api.get(`/analytics/number/${phoneNumber}?days=${days}`);
  },
  getCalls: (options = {}) => {
    const params = new URLSearchParams();
    if (options.phoneNumber) params.append('phoneNumber', options.phoneNumber);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.limit) params.append('limit', options.limit);
    if (options.status) params.append('status', options.status);
    return api.get(`/analytics/calls?${params}`);
  },
  getSetterPerformance: (days = 7) => {
    return api.get(`/analytics/setters?days=${days}`);
  },
};

// Closers API
export const closersApi = {
  getClosers: () => api.get('/closers'),  // Gets all @tjr-trades.com users from GHL
  onboardCloser: (data) => api.post('/closers/onboard', data),
  offboardCloser: (ghlUserId, platforms) => api.delete(`/closers/offboard/${ghlUserId}`, { data: { platforms } }),
  getPlatforms: (ghlUserId) => api.get(`/closers/${ghlUserId}/platforms`),
};

// Calendly API
export const calendlyApi = {
  getUser: () => api.get('/calendly/user'),
  getOrganization: () => api.get('/calendly/organization'),
  getEventTypes: () => api.get('/calendly/event-types'),
  getScheduledEvents: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.min_start_time) queryParams.append('min_start_time', params.min_start_time);
    if (params.max_start_time) queryParams.append('max_start_time', params.max_start_time);
    if (params.status) queryParams.append('status', params.status);
    if (params.count) queryParams.append('count', params.count);
    return api.get(`/calendly/scheduled-events?${queryParams}`);
  },
  getTodayEvents: () => api.get('/calendly/scheduled-events/today'),
  getMembers: () => api.get('/calendly/members'),
  getHealth: () => api.get('/calendly/health')
};

export default api;