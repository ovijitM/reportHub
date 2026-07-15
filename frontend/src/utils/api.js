import { isOnline, queueRequest } from './db.js';

const TOKEN_KEY = 'jupiter_token';

// Simple Custom Offline Error class
export class OfflineError extends Error {
  constructor(message, queuedId) {
    super(message);
    this.name = 'OfflineError';
    this.queuedId = queuedId;
  }
}

// Global API Request Helper
export const apiRequest = async (url, method = 'GET', body = null, entryType = null, dateStr = null) => {
  const token = localStorage.getItem(TOKEN_KEY);
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  // If user is trying to save/mutate data and is offline, intercept and queue
  if ((method === 'POST' || method === 'PUT') && !isOnline() && entryType && dateStr) {
    const queuedId = queueRequest(entryType, dateStr, url, method, body);
    throw new OfflineError('Saved locally (Offline)', queuedId);
  }

  try {
    const response = await fetch(url, options);
    
    // Check for authorization expired/cleared
    if (response.status === 401 && token) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('auth_expired'));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }

    // Handle PDF or blob downloads
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      return await response.blob();
    }

    return await response.json();
  } catch (error) {
    // If fetch failed due to network disruption (but isOnline didn't catch it yet)
    if (error instanceof TypeError && (method === 'POST' || method === 'PUT') && entryType && dateStr) {
      const queuedId = queueRequest(entryType, dateStr, url, method, body);
      throw new OfflineError('Connection failed. Saved locally.', queuedId);
    }
    throw error;
  }
};

// Auth API Calls
export const apiAuth = {
  login: async (phone, password) => {
    const res = await apiRequest('/api/auth/login', 'POST', { phone, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    return res.user;
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
  },
  me: async () => {
    return await apiRequest('/api/auth/me');
  }
};

// Agent Data Logging Calls
export const apiAgent = {
  submitDailyWorks: async (dateStr, data) => {
    return await apiRequest('/api/daily-works', 'POST', { date: dateStr, ...data }, 'daily-works', dateStr);
  },
  getDailyWorks: async (staffId, from, to) => {
    return await apiRequest(`/api/daily-works?staffId=${staffId}&from=${from}&to=${to}`);
  },
  submitDailyOrders: async (dateStr, data) => {
    return await apiRequest('/api/daily-orders', 'POST', { date: dateStr, ...data }, 'daily-orders', dateStr);
  },
  getDailyOrders: async (staffId, from, to) => {
    return await apiRequest(`/api/daily-orders?staffId=${staffId}&from=${from}&to=${to}`);
  },
  submitFieldVisits: async (dateStr, data) => {
    return await apiRequest('/api/field-visits', 'POST', { date: dateStr, ...data }, 'field-visits', dateStr);
  },
  getFieldVisits: async (staffId, from, to) => {
    return await apiRequest(`/api/field-visits?staffId=${staffId}&from=${from}&to=${to}`);
  }
};

// Admin Control Panel Calls
export const apiAdmin = {
  getAgents: async () => {
    return await apiRequest('/api/admin/agents');
  },
  createAgent: async (data) => {
    return await apiRequest('/api/admin/agents', 'POST', data);
  },
  updateAgent: async (id, data) => {
    return await apiRequest(`/api/admin/agents/${id}`, 'PUT', data);
  },
  getMonthlyConfig: async (staffId, month, year) => {
    return await apiRequest(`/api/admin/staff-monthly-config/${staffId}/${month}/${year}`);
  },
  saveMonthlyConfig: async (staffId, month, year, data) => {
    return await apiRequest(`/api/admin/staff-monthly-config/${staffId}/${month}/${year}`, 'PUT', data);
  },
  getMarkets: async () => {
    return await apiRequest('/api/admin/markets');
  },
  createMarket: async (name, area) => {
    return await apiRequest('/api/admin/markets', 'POST', { name, area });
  },
  updateMarket: async (id, data) => {
    return await apiRequest(`/api/admin/markets/${id}`, 'PUT', data);
  },
  deleteMarket: async (id) => {
    return await apiRequest(`/api/admin/markets/${id}`, 'DELETE');
  },
  getOverview: async (month, year) => {
    return await apiRequest(`/api/admin/overview?month=${month}&year=${year}`);
  },
  reviewEntry: async (entryType, entryId) => {
    return await apiRequest(`/api/admin/review/${entryType}/${entryId}`, 'PUT');
  }
};

// PDF Downloads Call
export const apiPDF = {
  downloadSheet: async (sheetType, staffId, month, year) => {
    const blob = await apiRequest(`/api/pdf/${sheetType}/${staffId}/${month}/${year}`);
    return blob;
  }
};
