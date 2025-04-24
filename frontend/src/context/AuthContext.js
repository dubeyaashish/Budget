// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.login(email, password);
      
      if (response && response.token) {
        const userData = {
          ...response.user,
          role: response.role
        };
        
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(userData));
        setCurrentUser(userData);
        
        return {
          success: true,
          role: response.role
        };
      }
      return { success: false };
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to login');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.register(userData);
      return response;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.verifyOtp(email, otp);
      return response;
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    navigate('/login');
  };

  const getProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.getProfile();
      setCurrentUser(prevUser => ({
        ...prevUser,
        ...response
      }));
      
      return response;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch profile');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        error,
        login,
        register,
        verifyOtp,
        logout,
        getProfile,
        setError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};