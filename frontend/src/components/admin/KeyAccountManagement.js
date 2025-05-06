// frontend/src/components/admin/KeyAccountManagement.js
import React, { useState, useEffect, useContext } from 'react';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import creditService from '../../services/creditService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const KeyAccountManagement = () => {
  const { keyAccounts, isLoading: accountsLoading, error: accountsError } = useContext(KeyAccountContext);
  
  const [budgetData, setBudgetData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [accountTotals, setAccountTotals] = useState({});
  const [departmentByAccount, setDepartmentByAccount] = useState({});
  
  // Load budget master data
  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        setIsLoading(true);
        
        // Get budget master data
        const data = await creditService.getBudgetMasterData();
        console.log('Raw budget data:', data);
        setBudgetData(data);
        
        // Process data for account totals and department distribution
        const totals = {};
        const deptDistribution = {};
        
        // Make sure we're working with an array
        const dataArray = Array.isArray(data) ? data : [];
        
        dataArray.forEach(item => {
          // Skip entries with no key_account or amount
          if (!item.key_account || item.amount === undefined) return;
          
          const accountId = item.key_account;
          const amount = parseFloat(item.amount) || 0;
          const deptName = item.department_name || `Department ${item.department}`;
          
          // Sum up totals by account
          if (!totals[accountId]) {
            totals[accountId] = 0;
          }
          totals[accountId] += amount;
          
          // Track department distribution
          if (!deptDistribution[accountId]) {
            deptDistribution[accountId] = {};
          }
          if (!deptDistribution[accountId][deptName]) {
            deptDistribution[accountId][deptName] = 0;
          }
          deptDistribution[accountId][deptName] += amount;
        });
        
        console.log('Account totals:', totals);
        console.log('Department distribution:', deptDistribution);
        
        setAccountTotals(totals);
        setDepartmentByAccount(deptDistribution);
      } catch (err) {
        console.error('Error fetching budget data:', err);
        setError('Failed to load budget data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBudgetData();
  }, []);
  
  // Toggle account expansion
  const toggleAccountExpand = (accountId) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };
  
  // Get enriched account data with totals
  const getEnrichedAccounts = () => {
    if (!keyAccounts || !Array.isArray(keyAccounts)) {
      console.error('keyAccounts is not an array:', keyAccounts);
      return [];
    }
    
    return keyAccounts.map(account => ({
      ...account,
      totalBudget: accountTotals[account.id] || 0
    }))
    // Sort by total budget (highest first)
    .sort((a, b) => b.totalBudget - a.totalBudget);
  };
  
  // Sort departments by amount for an account
  const getSortedDepartments = (accountId) => {
    if (!departmentByAccount[accountId]) return [];
    
    return Object.entries(departmentByAccount[accountId])
      .map(([dept, amount]) => ({ name: dept, amount }))
      .sort((a, b) => b.amount - a.amount);
  };
  
  // Combined loading state
  const isPageLoading = isLoading || accountsLoading;
  
  // Combined error state
  const pageError = error || accountsError;
  
  const enrichedAccounts = getEnrichedAccounts();
  
  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Key Account Management</h1>
      
      {pageError && <AlertMessage type="error" message={pageError} />}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Key Accounts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Click on the arrow to see department distribution for each account
          </p>
          {budgetData.length === 0 && (
            <div className="mt-2 text-sm text-yellow-500">No budget data found. Make sure budget_master table has data.</div>
          )}
        </div>
        
        <div className="p-6">
          {isPageLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          ) : enrichedAccounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Budget
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrichedAccounts.map(account => {
                    const isExpanded = expandedAccounts[account.id];
                    const sortedDepts = getSortedDepartments(account.id);
                    const hasDeptData = sortedDepts.length > 0;
                    
                    return (
                      <React.Fragment key={account.id}>
                        <tr className={isExpanded ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <button 
                              onClick={() => toggleAccountExpand(account.id)}
                              className={`mr-2 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            {account.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {account.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {account.account_type || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(account.totalBudget)}
                          </td>
                        </tr>
                        
                        {/* Expandable department distribution section */}
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan="4" className="px-8 py-4">
                              <div className="border-l-4 border-indigo-400 pl-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Department Distribution</h4>
                                
                                {hasDeptData ? (
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Department
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Amount
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          % of Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {sortedDepts.map((dept, index) => {
                                        const percentage = account.totalBudget > 0 
                                          ? (dept.amount / account.totalBudget) * 100 
                                          : 0;
                                        
                                        return (
                                          <tr key={`${account.id}-${index}`} className="text-sm">
                                            <td className="px-4 py-2 text-gray-900">{dept.name}</td>
                                            <td className="px-4 py-2 text-gray-600">{formatCurrency(dept.amount)}</td>
                                            <td className="px-4 py-2">
                                              <div className="flex items-center">
                                                <div className="w-20 bg-gray-200 rounded-full h-1.5 mr-2">
                                                  <div 
                                                    className="h-1.5 rounded-full bg-indigo-500" 
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                  ></div>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                  {percentage.toFixed(1)}%
                                                </span>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-sm text-gray-500">No department distribution data available for this account.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No key accounts found or no budget data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyAccountManagement;