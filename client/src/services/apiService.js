import axios from 'axios';

// Vercel deployment - use Vercel API routes
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://fhapp-client-9sz4a06ks-farids-projects-0239e101.vercel.app'
  : 'http://localhost:5000';

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

// GitHub Pages Authentication - Local Storage Only
export const authService = {
  // Login user (local storage simulation)
  login: async (email, password) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Get stored users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Find user by email
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Validate password
    if (user.password !== password) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT-like token
    const token = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      iat: Date.now(),
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    };
  },

  // Register user (local storage simulation) 
  register: async (email, password, name) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingUser = users.find(u => u.email === email);
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const newUser = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(7),
      email,
      password, // In a real app, this would be hashed
      name: name || email.split('@')[0],
      createdAt: new Date().toISOString()
    };

    // Store user in localStorage
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    // Generate token
    const token = btoa(JSON.stringify({
      userId: newUser.id,
      email: newUser.email,
      iat: Date.now(),
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));

    return {
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      },
      token
    };
  },

  // Get current user (from local storage)
  getCurrentUser: async () => {
    const user = localStorage.getItem('user');
    if (user) {
      return {
        success: true,
        user: JSON.parse(user)
      };
    }
    throw new Error('No user found');
  },

  // Forgot password (local simulation)
  forgotPassword: async (email) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}&email=${email}`;
    
    // Store the reset token for validation later
    localStorage.setItem(`reset_token_${email}`, JSON.stringify({
      token: resetToken,
      email: email,
      expires: Date.now() + (15 * 60 * 1000) // 15 minutes
    }));
    
    return {
      success: true,
      message: 'Password reset instructions sent to your email',
      resetUrl,
      isDemoMode: true
    };
  },

  // Reset password (local simulation)
  resetPassword: async (token, email, password) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!token || !email || !password) {
      throw new Error('Token, email, and new password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Validate the reset token
    const storedTokenData = localStorage.getItem(`reset_token_${email}`);
    if (!storedTokenData) {
      throw new Error('Invalid or expired reset token');
    }

    const tokenData = JSON.parse(storedTokenData);
    if (tokenData.token !== token || tokenData.expires < Date.now()) {
      localStorage.removeItem(`reset_token_${email}`);
      throw new Error('Invalid or expired reset token');
    }

    // Update the user's password in localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex !== -1) {
      users[userIndex].password = password;
      localStorage.setItem('users', JSON.stringify(users));
    }

    // Clean up the reset token
    localStorage.removeItem(`reset_token_${email}`);

    return {
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.'
    };
  },

  // Check if token is valid
  isTokenValid: () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      // Decode the token and check expiration
      const payload = JSON.parse(atob(token));
      const currentTime = Date.now();
      
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }
};

export default apiService;