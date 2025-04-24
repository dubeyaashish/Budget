// frontend/src/components/admin/KeyAccountAllocation.js
import React, { useState, useContext, useEffect } from 'react';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const KeyAccountAllocation = () => {
  const { keyAccounts, accountsWithUsage, isLoading, error, fetchKeyAccounts, upsertKeyAccount, setError } = useContext(KeyAccountContext);
  
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [activeTab, setActiveTab] = useState('account-type');
  const [budgetAllocations, setBudgetAllocations] = useState({});
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  
  // Get unique account types
  const accountTypes = [...new Set(keyAccounts.map(account => account.account_type))].filter(Boolean);
  
  // Group accounts by their types
  const accountsByType = keyAccounts.reduce((acc, account) => {
    if (account.account_type) {
      if (!acc[account.account_type]) {
        acc[account.account_type] = [];
      }
      acc[account.account_type].push(account);
    } else {
      if (!acc['Uncategorized']) {
        acc['Uncategorized'] = [];
      }
      acc['Uncategorized'].push(account);
    }
    return acc;
  }, {});
  
  // Initialize budget allocations from existing data
  useEffect(() => {
    const initialAllocations = {};
    keyAccounts.forEach(account => {
      initialAllocations[account.id] = account.total_budget;
    });
    setBudgetAllocations(initialAllocations);
  }, [keyAccounts]);
  
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);
  
  // Filter account types based on filter
  const filteredTypes = filterType 
    ? accountTypes.filter(type => type.toLowerCase().includes(filterType.toLowerCase())) 
    : accountTypes;
  
  const handleBudgetChange = (accountId, value) => {
    setBudgetAllocations(prev => ({
      ...prev,
      [accountId]: parseFloat(value) || 0
    }));
    setHasPendingChanges(true);
  };
  
  const handleSaveChanges = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Create array of promises for all account updates
      const updatePromises = Object.entries(budgetAllocations).map(([id, budget]) => {
        const account = keyAccounts.find(acc => acc.id === id);
        if (!account || account.total_budget === budget) return null;
        
        return upsertKeyAccount({
          id,
          name: account.name,
          account_type: account.account_type,
          total_budget: budget
        });
      }).filter(Boolean);
      
      await Promise.all(updatePromises);
      
      setSuccess('Budget allocations saved successfully!');
      setHasPendingChanges(false);
      fetchKeyAccounts();
    } catch (err) {
      console.error('Error saving budget allocations:', err);
      setError('Failed to save budget allocations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBulkUpdate = (type, percentage) => {
    if (!type || isNaN(percentage)) return;
    
    const newAllocations = { ...budgetAllocations };
    const accountsOfType = accountsByType[type] || [];
    
    accountsOfType.forEach(account => {
      const currentBudget = parseFloat(newAllocations[account.id]) || 0;
      const increase = currentBudget * (percentage / 100);
      newAllocations[account.id] = currentBudget + increase;
    });
    
    setBudgetAllocations(newAllocations);
    setHasPendingChanges(true);
  };
  
  const getTotalBudgetForType = (type) => {
    const accounts = accountsByType[type] || [];
    return accounts.reduce((sum, account) => sum + (parseFloat(budgetAllocations[account.id]) || 0), 0);
  };
  
  const getTotalUsedForType = (type) => {
    const accounts = accountsByType[type] || [];
    return accounts.reduce((sum, account) => {
      const matchingUsage = accountsWithUsage.find(a => a.id === account.id);
      return sum + (matchingUsage ? parseFloat(matchingUsage.used_amount) || 0 : 0);
    }, 0);
  };
  
  const getOverallTotal = () => {
    return Object.values(budgetAllocations).reduce((sum, budget) => sum + (parseFloat(budget) || 0), 0);
  };
  
  const getOverallUsed = () => {
    return accountsWithUsage.reduce((sum, account) => sum + (parseFloat(account.used_amount) || 0), 0);
  };
  
  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Budget Allocation</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      {success && <AlertMessage type="success" message={success} />}
      
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <h2 className="text-lg font-medium text-gray-900">Overall Budget</h2>
            
            <div className="mt-4 md:mt-0 bg-gray-100 rounded-lg p-4 text-center">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(getOverallTotal())}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Used</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(getOverallUsed())}</p>
                </div>
              </div>
              
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className="h-2.5 rounded-full bg-blue-600" 
                    style={{ width: `${Math.min(getOverallUsed() / getOverallTotal() * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getOverallTotal() > 0 
                    ? `${Math.round(getOverallUsed() / getOverallTotal() * 100)}% Used`
                    : '0% Used'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'account-type' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('account-type')}
            >
              By Account Type
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'account-detail' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('account-detail')}
            >
              Individual Accounts
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          ) : (
            <>
              {activeTab === 'account-type' ? (
                <div>
                  <div className="mb-4">
                    <label htmlFor="filter-type" className="block text-sm font-medium text-gray-700 mb-1">
                      Filter Account Types
                    </label>
                    <input
                      type="text"
                      id="filter-type"
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Filter account types..."
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    />
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Number of Accounts
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Budget
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Used
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Available
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usage %
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bulk Adjust
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTypes.map(type => {
                          const accounts = accountsByType[type] || [];
                          const totalBudget = getTotalBudgetForType(type);
                          const totalUsed = getTotalUsedForType(type);
                          const usagePercentage = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;
                          
                          return (
                            <tr key={type}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {accounts.length}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(totalBudget)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(totalUsed)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(totalBudget - totalUsed)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full ${
                                        usagePercentage > 90 
                                          ? 'bg-red-600' 
                                          : usagePercentage > 70 
                                          ? 'bg-yellow-400' 
                                          : 'bg-green-600'
                                      }`} 
                                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="ml-2 text-xs text-gray-500">
                                    {Math.round(usagePercentage)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                <div className="flex items-center justify-end">
                                  <div className="relative rounded-md shadow-sm w-24 mr-2">
                                    <input
                                      type="number"
                                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                                      placeholder="10"
                                      id={`bulk-${type}`}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                      <span className="text-gray-500 sm:text-sm">%</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    onClick={() => {
                                      const input = document.getElementById(`bulk-${type}`);
                                      const value = parseFloat(input.value);
                                      if (!isNaN(value)) {
                                        handleBulkUpdate(type, value);
                                      }
                                    }}
                                  >
                                    Apply
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <label htmlFor="filter-account" className="block text-sm font-medium text-gray-700 mb-1">
                      Filter Accounts
                    </label>
                    <input
                      type="text"
                      id="filter-account"
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Search accounts by ID or name..."
                    />
                  </div>
                  
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
                            Budget
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Used
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Available
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {keyAccounts.map(account => {
                          const usageData = accountsWithUsage.find(a => a.id === account.id) || {};
                          const used = parseFloat(usageData.used_amount) || 0;
                          const budget = parseFloat(budgetAllocations[account.id]) || 0;
                          const available = budget - used;
                          
                          return (
                            <tr key={account.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {account.id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {account.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {account.account_type || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="relative rounded-md shadow-sm">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">฿</span>
                                  </div>
                                  <input
                                    type="number"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-gray-300 rounded-md"
                                    value={budgetAllocations[account.id] || ''}
                                    onChange={(e) => handleBudgetChange(account.id, e.target.value)}
                                    min="0"
                                    step="0.01"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(used)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(available)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {hasPendingChanges && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                    onClick={() => {
                      // Reset to original values
                      const initialAllocations = {};
                      keyAccounts.forEach(account => {
                        initialAllocations[account.id] = account.total_budget;
                      });
                      setBudgetAllocations(initialAllocations);
                      setHasPendingChanges(false);
                    }}
                  >
                    Cancel Changes
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={handleSaveChanges}
                  >
                    {isSubmitting ? <LoadingSpinner /> : 'Save Changes'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyAccountAllocation;