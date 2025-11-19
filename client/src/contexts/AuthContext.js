import React, { createContext, useContext, useState, useEffect } from 'react';
import firebaseAuthService from '../services/firebaseAuthService';

// Create the AuthContext
const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on app start and listen to auth changes
  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified
        };
        setUser(userData);
        // Store in localStorage for persistence across page reloads
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Login function - Firebase handles this automatically via onAuthStateChange
  const login = async (email, password) => {
    return await firebaseAuthService.login(email, password);
  };

  // Register function
  const register = async (email, password, name) => {
    return await firebaseAuthService.register(email, password, name);
  };

  // Logout function
  const logout = async () => {
    return await firebaseAuthService.logout();
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    return await firebaseAuthService.forgotPassword(email);
  };

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Get authentication token
  const getToken = async () => {
    return await firebaseAuthService.getToken();
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    isAuthenticated,
    getToken,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;