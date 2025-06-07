import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * Creates a "plain" user object to ensure it's serializable.
 * This prevents errors with Redux Toolkit's state management.
 * NOTE: You may need to adjust the properties here (e.g., id, name, email)
 * to match what your API actually returns for the user.
 */
const serializeUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    // Add any other essential user properties here
    // For example:
    // role: user.role,
    // avatarUrl: user.avatarUrl,
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token by getting user profile
      const response = await api.get('/auth/profile');
      // Use the serializeUser helper function before setting state
      setUser(serializeUser(response.data));
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user: userFromApi } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      
      // Update state using the serialized user object
      setUser(serializeUser(userFromApi));
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    // Redirect to login page
    window.location.href = '/login';
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};