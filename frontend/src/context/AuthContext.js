// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import departmentService from '../services/departmentService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Helper function to handle department resolution
  const resolveDepartmentInfo = async (userData) => {
    // If we have both ID and name, nothing to do
    if (userData.department_id && userData.department) {
      return userData;
    }
    
    try {
      // If we have department ID but no name
      if (userData.department_id && !userData.department) {
        const deptInfo = await departmentService.getDepartmentById(userData.department_id);
        if (deptInfo && deptInfo.name) {
          return {
            ...userData,
            department: deptInfo.name
          };
        }
      }
      
      // If we have department name but no ID
      if (userData.department && !userData.department_id) {
        const deptInfo = await departmentService.findDepartmentByName(userData.department);
        if (deptInfo && deptInfo.id) {
          return {
            ...userData,
            department_id: deptInfo.id
          };
        }
      }
    } catch (err) {
      console.error('Error resolving department info:', err);
    }
    
    // Return original data if we couldn't enhance it
    return userData;
  };

  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          let userData = JSON.parse(storedUser);
          
          // Try to enhance user data with department info
          userData = await resolveDepartmentInfo(userData);
          
          // If we still don't have complete department info, try to get it from profile
          if (!userData.department_id || !userData.department) {
            try {
              const profileData = await authService.getProfile();
              
              if (profileData) {
                // Merge profile with userData
                userData = {
                  ...userData,
                  ...profileData
                };
                
                // Try to resolve department again with enriched data
                userData = await resolveDepartmentInfo(userData);
              }
            } catch (profileErr) {
              console.error('Error fetching profile:', profileErr);
            }
          }
          
          // Update localStorage with enhanced user data
          localStorage.setItem('user', JSON.stringify(userData));
          setCurrentUser(userData);
        } catch (err) {
          console.error('Error processing user data:', err);
          const userData = JSON.parse(storedUser);
          setCurrentUser(userData);
        }
      }
      
      setIsLoading(false);
    };
    
    loadUserData();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.login(email, password);
      
      if (response && response.token) {
        let userData = {
          ...response.user,
          role: response.role
        };
        
        // Try to enhance with department info if needed
        userData = await resolveDepartmentInfo(userData);
        
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
      
      // For registration, remember that the department field in the form
      // is storing the department NAME not ID
      console.log('Registering user with department name:', userData.department);
      
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
      
      const profileData = await authService.getProfile();
      
      if (profileData) {
        // Merge with existing user data
        let updatedUser = {
          ...currentUser,
          ...profileData
        };
        
        // Try to enhance with department info
        updatedUser = await resolveDepartmentInfo(updatedUser);
        
        // Update state and localStorage
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        return updatedUser;
      }
      
      return currentUser;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch profile');
      return currentUser;
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