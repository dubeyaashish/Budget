import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoadingSpinner from './common/LoadingSpinner';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { currentUser, isLoading, getProfile } = useContext(AuthContext);
  const location = useLocation();

  // Check if token exists but user data is missing
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !currentUser) {
      getProfile();
    }
  }, [currentUser, getProfile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!currentUser) {
    console.log("No current user found, redirecting to login");
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log("User authenticated:", currentUser.role);
  
  if (requireAdmin && currentUser.role !== 'admin') {
    console.log("Non-admin user tried to access admin route");
    // Redirect to user dashboard if not admin
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;