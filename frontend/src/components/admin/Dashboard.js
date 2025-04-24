// frontend/src/components/admin/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import withdrawalService from '../../services/withdrawalService';
import departmentService from '../../services/departmentService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const AdminDashboard = () => {
  const { accountsWithUsage, getBudgetSummary } = useContext(KeyAccountContext);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    pendingRequests: [],
    departments: 0,
    pendingCount: 0,
    revisionCount: 0,
    totalBudget: 0,
    totalUsed: 0
  });
  const [topAccounts, setTopAccounts] = useState([]);
  const [topDepartments, setTopDepartments] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all needed data in parallel
        const [pendingRequests, departments, budgetSummary] = await Promise.all([
          withdrawalService.getAllPendingRequests(),
          departmentService.getAllDepartments(),
          getBudgetSummary()
        ]);
        
        // Get revision requests count - this would need a new endpoint
        const revisionCount = 0; // Placeholder until we have an endpoint
        
        setDashboardData({
          pendingRequests: pendingRequests.slice(0, 5), // Only show 5 most recent
          departments: departments.length,
          pendingCount: pendingRequests.length,
          revisionCount,
          totalBudget: budgetSummary.total_allocated,
          totalUsed: budgetSummary.total_used
        });
        
        // Process top accounts by usage
        const sortedAccounts = [...accountsWithUsage]
          .sort((a, b) => b.used_amount - a.used_amount)
          .slice(0, 5);
        
        setTopAccounts(sortedAccounts);
        
        // For top departments, we would need a new endpoint
        // Placeholder for now
        setTopDepartments([]);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [getBudgetSummary, accountsWithUsage]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 ml-64 flex justify-center items-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const usagePercentage = dashboardData.totalBudget > 0 
    ? (dashboardData.totalUsed / dashboardData.totalBudget) * 100 
    : 0;

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
          <h2 className="text-lg font-medium text-gray-900 mb-2">Revision Requests</h2>
          <p className="text-3xl font-bold text-yellow-500">{dashboardData.revisionCount}</p>
          <Link to="/admin/withdrawals" className="mt-3 text-sm text-indigo-600 block">View all</Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Departments</h2>
          <p className="text-3xl font-bold text-blue-500">{dashboardData.departments}</p>
          <Link to="/admin/departments" className="mt-3 text-sm text-indigo-600 block">Manage</Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Total Budget</h2>
          <p className="text-3xl font-bold text-green-500">{formatCurrency(dashboardData.totalBudget)}</p>
          <Link to="/admin/key-account-allocation" className="mt-3 text-sm text-indigo-600 block">Manage</Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Overall Budget Usage</h2>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">Used: {formatCurrency(dashboardData.totalUsed)}</span>
              <span className="text-gray-700">Total: {formatCurrency(dashboardData.totalBudget)}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full ${
                  usagePercentage > 90 ? 'bg-red-500' : 
                  usagePercentage > 70 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              ></div>
            </div>
            
            <div className="mt-2 text-right text-sm text-gray-500">
              {Math.round(usagePercentage)}% of budget used
            </div>
            
            <div className="mt-4">
              <Link 
                to="/admin/reports/departments" 
                className="text-indigo-600 hover:text-indigo-900"
              >
                View detailed reports →
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Top Accounts by Usage</h2>
          </div>
          
          <div className="p-6">
            {topAccounts.length > 0 ? (
              <div className="space-y-4">
                {topAccounts.map(account => {
                  const percentage = account.total_budget > 0 
                    ? (account.used_amount / account.total_budget) * 100 
                    : 0;
                  
                  return (
                    <div key={account.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-800">
                          {account.account_type}: {account.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatCurrency(account.used_amount)} / {formatCurrency(account.total_budget)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            percentage > 90 ? 'bg-red-500' : 
                            percentage > 70 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No account usage data available.</p>
            )}
            
            <div className="mt-4">
              <Link 
                to="/admin/key-accounts" 
                className="text-indigo-600 hover:text-indigo-900"
              >
                Manage key accounts →
              </Link>
            </div>
          </div>
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
                      Account
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
                        {request.account_name}
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