import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

const apiService = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiService.interceptors.request.use(
  (config) => {
    // Add auth token if available
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

// Response interceptor
apiService.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Optionally redirect to login or refresh the page
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Authentication methods
export const authService = {
  // Login user
  login: async (email, password) => {
    const response = await apiService.post('/api/auth/login', {
      email,
      password
    });
    return response.data;
  },

  // Register user
  register: async (email, password, name) => {
    const response = await apiService.post('/api/auth/register', {
      email,
      password,
      name
    });
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiService.get('/api/auth/me');
    return response.data;
  },

  // Create demo user
  createDemoUser: async () => {
    const response = await apiService.post('/api/auth/create-demo-user');
    return response.data;
  },

  // Check if token is valid
  isTokenValid: () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      // Basic token format check (you might want to add expiration check)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }
};

export default apiService;