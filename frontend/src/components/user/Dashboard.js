// frontend/src/components/user/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import creditService from '../../services/creditService';
import departmentService from '../../services/departmentService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const { getAccountSpendingByDepartment } = useContext(KeyAccountContext);
  
  const [creditRequests, setCreditRequests] = useState([]);
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [accountSpending, setAccountSpending] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [error, setError] = useState(null);
  const [departmentName, setDepartmentName] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState('');

  useEffect(() => {
    const fetchCreditRequests = async () => {
      try {
        setIsLoadingRequests(true);
        const requests = await creditService.getUserCreditRequests();
        const revisions = await creditService.getUserRevisionRequests();
        
        setCreditRequests(requests);
        setRevisionRequests(revisions);
      } catch (err) {
        console.error('Error fetching requests:', err);
        setError('Failed to load your credit requests');
      } finally {
        setIsLoadingRequests(false);
      }
    };

    const fetchDepartmentData = async () => {
      try {
        if (currentUser && currentUser.department) {
          const dept = await departmentService.getDepartmentById(currentUser.department);
          if (dept) {
            setDepartmentName(dept.name);
          }
          
          setIsLoadingAccounts(true);
          const spending = await getAccountSpendingByDepartment(currentUser.department);
          setAccountSpending(spending);
        }
      } catch (err) {
        console.error('Error fetching department data:', err);
        setError('Failed to load department budget data');
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    fetchCreditRequests();
    fetchDepartmentData();
  }, [currentUser, getAccountSpendingByDepartment]);

  // Get recent credit requests (last 5)
  const recentRequests = creditRequests.slice(0, 5);

  // Count requests by status
  const pendingCount = creditRequests.filter(req => req.status === 'pending').length;
  const approvedCount = creditRequests.filter(req => req.status === 'approved').length;
  const rejectedCount = creditRequests.filter(req => req.status === 'rejected').length;
  const revisionCount = revisionRequests.length;

  // Get account spending by type
  const accountTypes = [...new Set(accountSpending.map(acc => acc.account_type))].filter(Boolean);
  
  // Filter accounts based on selected type
  const filteredAccounts = selectedAccountType 
    ? accountSpending.filter(acc => acc.account_type === selectedAccountType)
    : accountSpending;

  // Calculate total spending and budget by type
  const spendingByType = accountTypes.reduce((acc, type) => {
    const accounts = accountSpending.filter(a => a.account_type === type);
    const totalSpent = accounts.reduce((sum, a) => sum + parseFloat(a.total_spent || 0), 0);
    const totalBudget = accounts.reduce((sum, a) => sum + parseFloat(a.total_budget || 0), 0);
    
    acc[type] = { totalSpent, totalBudget };
    return acc;
  }, {});

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Pending Requests</h2>
          <p className="text-3xl font-bold text-orange-500">{pendingCount}</p>
          <Link to="/credit-history" className="mt-3 text-sm text-indigo-600 block">View all</Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Approved Requests</h2>
          <p className="text-3xl font-bold text-green-500">{approvedCount}</p>
          <Link to="/credit-history" className="mt-3 text-sm text-indigo-600 block">View all</Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Rejected Requests</h2>
          <p className="text-3xl font-bold text-red-500">{rejectedCount}</p>
          <Link to="/credit-history" className="mt-3 text-sm text-indigo-600 block">View all</Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Needs Revision</h2>
          <p className="text-3xl font-bold text-yellow-500">{revisionCount}</p>
          <Link to="/revision-requests" className="mt-3 text-sm text-indigo-600 block">View all</Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Department Budget Overview
              {departmentName && ` - ${departmentName}`}
            </h2>
          </div>
          
          <div className="p-6">
            {isLoadingAccounts ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label htmlFor="account-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Account Type
                  </label>
                  <select
                    id="account-type-filter"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedAccountType}
                    onChange={(e) => setSelectedAccountType(e.target.value)}
                  >
                    <option value="">All Account Types</option>
                    {accountTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                {accountTypes.length > 0 ? (
                  <div className="space-y-4">
                    {(!selectedAccountType ? accountTypes : [selectedAccountType]).map(type => {
                      const { totalSpent, totalBudget } = spendingByType[type] || { totalSpent: 0, totalBudget: 0 };
                      const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
                      
                      return (
                        <div key={type} className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-medium text-gray-900 mb-2">{type}</h3>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Spent: {formatCurrency(totalSpent)}</span>
                            <span>Budget: {formatCurrency(totalBudget)}</span>
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
                          <div className="text-right text-xs text-gray-500 mt-1">
                            {Math.round(percentage)}% used
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500">No budget data available for your department.</p>
                )}
                
                <div className="mt-4">
                  <Link 
                    to="/new-credit" 
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    New Credit Request
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Available Key Accounts</h2>
          </div>
          
          <div className="p-6">
            {isLoadingAccounts ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : filteredAccounts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Available Credit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAccounts.map(account => {
                      const totalSpent = parseFloat(account.total_spent || 0);
                      const totalBudget = parseFloat(account.total_budget || 0);
                      const available = totalBudget - totalSpent;
                      const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
                      
                      return (
                        <tr key={account.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {account.account_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {account.account_type || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(available)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    percentage > 90 ? 'bg-red-500' : 
                                    percentage > 70 ? 'bg-yellow-500' : 
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {Math.round(percentage)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No account data available for the selected filter.</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Credit Requests</h2>
            <Link 
              to="/credit-history" 
              className="text-indigo-600 hover:text-indigo-900"
            >
              View all
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {isLoadingRequests ? (
            <div className="flex justify-center py-8">
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
                      Account
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
                        {request.account_name}
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
                            : request.status === 'revision'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
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
            <p className="text-gray-500">No credit requests found.</p>
          )}
        </div>
      </div>
      
      {revisionCount > 0 && (
        <div className="mt-6 bg-yellow-50 rounded-lg shadow p-6 border border-yellow-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Attention Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You have {revisionCount} {revisionCount === 1 ? 'request' : 'requests'} that {revisionCount === 1 ? 'needs' : 'need'} revision.
                </p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <Link
                    to="/revision-requests"
                    className="bg-yellow-100 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                  >
                    View Revision Requests
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;