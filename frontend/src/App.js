// frontend/src/App.js - Updated
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Sidebar from './components/common/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Auth components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import VerifyOTP from './components/auth/VerifyOTP';

// User components
import UserDashboard from './components/user/Dashboard';
import NewWithdrawalRequest from './components/user/NewWithdrawalRequest';
import WithdrawalHistory from './components/user/WithdrawalHistory';

// Admin components
import AdminDashboard from './components/admin/Dashboard';
import DepartmentManagement from './components/admin/DepartmentManagement';
import CategoryManagement from './components/admin/CategoryManagement';
import BudgetLimits from './components/admin/BudgetLimits';
import WithdrawalApproval from './components/admin/WithdrawalApproval';
import UserManagement from './components/admin/UserManagement';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          
          <main className="flex-grow flex">
            {/* Sidebar is now only rendered inside protected routes */}
            
            <Routes>
              {/* Public routes - No sidebar for these */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              
              {/* Regular user routes - With sidebar */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <div className="flex w-full">
                      <Sidebar />
                      <UserDashboard />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/new-withdrawal" 
                element={
                  <ProtectedRoute>
                    <div className="flex w-full">
                      <Sidebar />
                      <NewWithdrawalRequest />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/withdrawal-history" 
                element={
                  <ProtectedRoute>
                    <div className="flex w-full">
                      <Sidebar />
                      <WithdrawalHistory />
                    </div>
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin routes - With sidebar */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <div className="flex w-full">
                      <Sidebar />
                      <AdminDashboard />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/departments" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <div className="flex w-full">
                      <Sidebar />
                      <DepartmentManagement />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/categories" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <div className="flex w-full">
                      <Sidebar />
                      <CategoryManagement />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/budget-limits" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <div className="flex w-full">
                      <Sidebar />
                      <BudgetLimits />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/withdrawals" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <div className="flex w-full">
                      <Sidebar />
                      <WithdrawalApproval />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/withdrawals/:id" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <div className="flex w-full">
                      <Sidebar />
                      <WithdrawalApproval />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <div className="flex w-full">
                      <Sidebar />
                      <UserManagement />
                    </div>
                  </ProtectedRoute>
                } 
              />
              
              {/* Default routes */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;