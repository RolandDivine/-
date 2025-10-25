import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (userData) => api.post('/api/auth/register', userData),
  getCurrentUser: () => api.get('/api/auth/me'),
  updateProfile: (userData) => api.put('/api/auth/profile', userData),
  changePassword: (currentPassword, newPassword) => 
    api.put('/api/auth/password', { currentPassword, newPassword }),
};

// Signals API
export const signalsAPI = {
  getSignals: (params) => api.get('/api/signals', { params }),
  getSignal: (id) => api.get(`/api/signals/${id}`),
  getSignalsByType: (type, params) => api.get(`/api/signals/type/${type}`, { params }),
  getActiveSignals: (params) => api.get('/api/signals/active/all', { params }),
  getSignalStats: () => api.get('/api/signals/stats/overview'),
  getTopSignals: (params) => api.get('/api/signals/performance/top', { params }),
  getSignalFeed: (params) => api.get('/api/signals/feed/live', { params }),
  searchSignals: (params) => api.get('/api/signals/search', { params }),
  updateSignalStatus: (id, status) => api.put(`/api/signals/${id}/status`, { status }),
};

// Portfolio API
export const portfolioAPI = {
  getPortfolio: () => api.get('/api/portfolio'),
  getPerformance: (params) => api.get('/api/portfolio/performance', { params }),
  getAllocation: () => api.get('/api/portfolio/allocation'),
  getPositions: () => api.get('/api/portfolio/positions'),
  getRiskMetrics: () => api.get('/api/portfolio/risk'),
  getSummary: () => api.get('/api/portfolio/summary'),
  updatePosition: (positionId, data) => api.put(`/api/portfolio/positions/${positionId}`, data),
  closePosition: (positionId) => api.delete(`/api/portfolio/positions/${positionId}`),
  getAnalytics: (params) => api.get('/api/portfolio/analytics', { params }),
};

// Trades API
export const tradesAPI = {
  getTrades: (params) => api.get('/api/trades', { params }),
  getTrade: (id) => api.get(`/api/trades/${id}`),
  createTrade: (tradeData) => api.post('/api/trades', tradeData),
  executeTrade: (id, data) => api.post(`/api/trades/${id}/execute`, data),
  cancelTrade: (id) => api.post(`/api/trades/${id}/cancel`),
  getTradeStats: (params) => api.get('/api/trades/stats/overview', { params }),
  getPerformanceByType: (params) => api.get('/api/trades/performance/type', { params }),
  updateTradeLevels: (id, data) => api.put(`/api/trades/${id}/levels`, data),
};

// Market API
export const marketAPI = {
  getOverview: () => api.get('/api/market/overview'),
  getTicker: () => api.get('/api/market/ticker'),
  getMarketData: (params) => api.get('/api/market/data', { params }),
  getGlobalData: () => api.get('/api/market/global'),
  getDerivatives: () => api.get('/api/market/derivatives'),
  getFundingRates: () => api.get('/api/market/funding-rates'),
  getCoinDetails: (id) => api.get(`/api/market/coins/${id}`),
  getCoinChart: (id, params) => api.get(`/api/market/coins/${id}/chart`, { params }),
  getFearGreed: () => api.get('/api/market/fear-greed'),
  getTrending: () => api.get('/api/market/trending'),
  getMarketCapHistory: (params) => api.get('/api/market/market-cap/history', { params }),
  getVolumeHistory: (params) => api.get('/api/market/volume/history', { params }),
  getPriceUpdates: (symbols) => api.get('/api/market/prices', { params: { symbols } }),
  searchCoins: (params) => api.get('/api/market/search', { params }),
  getMarketMetrics: () => api.get('/api/market/metrics'),
};

// AI API
export const aiAPI = {
  generateSignals: () => api.post('/api/ai/generate-signals'),
  getPerformance: (params) => api.get('/api/ai/performance', { params }),
  getModelInfo: () => api.get('/api/ai/model-info'),
  getRecommendations: (params) => api.get('/api/ai/recommendations', { params }),
  getAnalysis: (signalId) => api.get(`/api/ai/analysis/${signalId}`),
  getTrainingData: (params) => api.get('/api/ai/training-data', { params }),
};

export default api;
