// src/services/api.js
// Central Axios instance with JWT auto-attach and error interceptors

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 auto-logout ─────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login?reason=session_expired';
    }
    return Promise.reject(error);
  }
);

// ── Auth API calls ────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  logout: () => api.post('/auth/logout')
};

// ── Resource API calls ────────────────────────────────────────────────────────
export const resourceAPI = {
  getDashboard: () => api.get('/resources/dashboard'),
  getAdmin: () => api.get('/resources/admin'),
  getLogs: (params) => api.get('/resources/logs', { params }),
  toggleUser: (id) => api.patch(`/resources/admin/users/${id}/toggle`)
};

export default api;