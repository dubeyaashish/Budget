// frontend/src/components/user/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import withdrawalService from '../../services/withdrawalService';
import budgetService from '../../services/budgetService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [budgetLimits, setBudgetLimits] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWithdrawalRequests = async () => {
      try {
        const requests = await withdrawalService.getUserWithdrawalRequests();
        setWithdrawalRequests(requests);
      } catch (err) {
        console.error('Error fetching withdrawal requests:', err);
        setError('Failed to load your withdrawal requests');
      } finally {
        setIsLoadingRequests(false);
      }
    };

    const fetchBudgetLimits = async () => {
      try {
        if (currentUser) {
          const limits = await budgetService.getUserBudgetLimits(currentUser.id);
          setBudgetLimits(limits);
        }
      } catch (err) {
        console.error('Error fetching budget limits:', err);
        setError('Failed to load your budget limits');
      } finally {
        setIsLoadingBudgets(false);
      }
    };

    fetchWithdrawalRequests();
    fetchBudgetLimits();
  }, [currentUser]);

  // Get recent withdrawal requests (last 5)
  const recentRequests = withdrawalRequests.slice(0, 5);

  // Count requests by status
  const pendingCount = withdrawalRequests.filter(req => req.status === 'pending').length;
  const approvedCount = withdrawalRequests.filter(req => req.status === 'approved').length;
  const rejectedCount = withdrawalRequests.filter(req => req.status === 'rejected').length;

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">User Dashboard</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Pending Requests</h2>
          <p className="text-3xl font-bold text-orange-500">{pendingCount}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Approved Requests</h2>
          <p className="text-3xl font-bold text-green-500">{approvedCount}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Rejected Requests</h2>
          <p className="text-3xl font-bold text-red-500">{rejectedCount}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Withdrawal Requests</h2>
          </div>
          
          <div className="p-6">
            {isLoadingRequests ? (
              <div className="flex justify-center">
                <LoadingSpinner size="large" />
              </div>
            ) : recentRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
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
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentRequests.map(request => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            request.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : request.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No withdrawal requests found.</p>
            )}
            
            <div className="mt-4">
              <Link 
                to="/withdrawal-history" 
                className="text-indigo-600 hover:text-indigo-900"
              >
                View all requests
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Your Budget Limits</h2>
          </div>
          
          <div className="p-6">
            {isLoadingBudgets ? (
              <div className="flex justify-center">
                <LoadingSpinner size="large" />
              </div>
            ) : budgetLimits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Available Budget
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {budgetLimits.map(limit => (
                      <tr key={limit.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {limit.department_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {limit.category_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(limit.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No budget limits found.</p>
            )}
            
            <div className="mt-4">
              <Link 
                to="/new-withdrawal" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                New Withdrawal Request
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;