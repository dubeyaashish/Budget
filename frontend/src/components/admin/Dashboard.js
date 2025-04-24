// frontend/src/components/admin/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import withdrawalService from '../../services/withdrawalService';
import budgetService from '../../services/budgetService';
import departmentService from '../../services/departmentService';
import categoryService from '../../services/categoryService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    pendingRequests: [],
    departments: 0,
    categories: 0,
    pendingCount: 0,
    totalBudget: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all needed data in parallel
        const [pendingRequests, departments, categories, budgetLimits] = await Promise.all([
          withdrawalService.getAllPendingRequests(),
          departmentService.getAllDepartments(),
          categoryService.getAllCategories(),
          budgetService.getAllBudgetLimits()
        ]);
        
        // Calculate total budget across all departments and categories
        const totalBudget = budgetLimits.reduce((sum, limit) => sum + parseFloat(limit.total_amount), 0);
        
        setDashboardData({
          pendingRequests: pendingRequests.slice(0, 5), // Only show 5 most recent
          departments: departments.length,
          categories: categories.length,
          pendingCount: pendingRequests.length,
          totalBudget
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 ml-64 flex justify-center items-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Pending Requests</h2>
          <p className="text-3xl font-bold text-orange-500">{dashboardData.pendingCount}</p>
          <Link to="/admin/withdrawals" className="mt-3 text-sm text-indigo-600 block">View all</Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Departments</h2>
          <p className="text-3xl font-bold text-blue-500">{dashboardData.departments}</p>
          <Link to="/admin/departments" className="mt-3 text-sm text-indigo-600 block">Manage</Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Categories</h2>
          <p className="text-3xl font-bold text-purple-500">{dashboardData.categories}</p>
          <Link to="/admin/categories" className="mt-3 text-sm text-indigo-600 block">Manage</Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Total Budget</h2>
          <p className="text-3xl font-bold text-green-500">{formatCurrency(dashboardData.totalBudget)}</p>
          <Link to="/admin/budget-limits" className="mt-3 text-sm text-indigo-600 block">Manage</Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Pending Withdrawal Requests</h2>
            <Link 
              to="/admin/withdrawals" 
              className="text-indigo-600 hover:text-indigo-900"
            >
              View all
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {dashboardData.pendingRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.pendingRequests.map(request => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.requester_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.department_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(request.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          to={`/admin/withdrawals/${request.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No pending withdrawal requests found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;