import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import departmentService from '../../services/departmentService';
import creditService from '../../services/creditService';
import keyAccountService from '../../services/keyAccountService';
import authService from '../../services/authService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const NewCreditRequest = () => {
  const { currentUser } = useContext(AuthContext);
  const { accountsWithUsage, keyAccounts } = useContext(KeyAccountContext);

  const [formData, setFormData] = useState({
    department_id: '',
    version: 1,
    status: 'pending',
    request_id: null,
  });

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentKeyAccounts, setDepartmentKeyAccounts] = useState([]);
  const [accountEntries, setAccountEntries] = useState([]);
  const [availableKeyAccounts, setAvailableKeyAccounts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [budgetMasterData, setBudgetMasterData] = useState([]);
  const [allKeyAccounts, setAllKeyAccounts] = useState([]);

  const navigate = useNavigate();

  // Calculate total amount
  const totalAmount = accountEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);

  // Function to find department ID from department name
  const findDepartmentIdByName = (deptName, deptsList) => {
    if (!deptName || !deptsList || !deptsList.length) return null;
    
    const exactMatch = deptsList.find(
      d => d.name.toLowerCase() === deptName.toLowerCase()
    );
    if (exactMatch) return exactMatch.id;
    
    const partialMatch = deptsList.find(
      d => d.name.toLowerCase().includes(deptName.toLowerCase()) || 
           deptName.toLowerCase().includes(d.name.toLowerCase())
    );
    if (partialMatch) return partialMatch.id;
    
    return null;
  };

  // Fetch the initial data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !currentUser.id) {
        console.warn('No valid currentUser, skipping fetch');
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }
    
      try {
        setIsLoading(true);
        
        // Get all departments
        const departmentsData = await departmentService.getAllDepartments();
        setDepartments(departmentsData);
        
        // Fetch ALL key accounts for the dropdown
        try {
          const allAccounts = await keyAccountService.getAllKeyAccounts();
          console.log('Fetched ALL key accounts:', allAccounts);
          if (allAccounts && allAccounts.length > 0) {
            setAllKeyAccounts(allAccounts);
          }
        } catch (kaError) {
          console.error('Error fetching all key accounts:', kaError);
        }
        
        // Determine the user's department ID
        let userDeptId = null;
        let userDeptName = null;
        
        if (currentUser.department_id) {
          userDeptId = currentUser.department_id;
          const deptInfo = departmentsData.find(d => d.id == userDeptId);
          if (deptInfo) userDeptName = deptInfo.name;
        } else if (currentUser.departments && currentUser.departments.length > 0) {
          userDeptId = currentUser.departments[0].id;
          userDeptName = currentUser.departments[0].name;
        } else if (currentUser.department) {
          userDeptName = currentUser.department;
          userDeptId = findDepartmentIdByName(userDeptName, departmentsData);
        }
        
        if (!userDeptId) {
          const userProfile = await authService.getProfile();
          if (userProfile.department_id) {
            userDeptId = userProfile.department_id;
            const deptInfo = departmentsData.find(d => d.id == userDeptId);
            if (deptInfo) userDeptName = deptInfo.name;
          } else if (userProfile.department) {
            userDeptName = userProfile.department;
            userDeptId = findDepartmentIdByName(userDeptName, departmentsData);
          }
        }
        
        if (userDeptName && !userDeptId) {
          const deptByName = await departmentService.findDepartmentByName(userDeptName);
          if (deptByName && deptByName.id) userDeptId = deptByName.id;
        }
        
        if (userDeptId) {
          setSelectedDepartment(userDeptId);
          setDepartmentName(userDeptName || departmentsData.find(d => d.id == userDeptId)?.name || `Department ${userDeptId}`);
          setFormData(prev => ({ ...prev, department_id: userDeptId }));
          await loadDepartmentData(userDeptId);
        } else {
          setError('Could not determine your department. Please contact an administrator.');
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Failed to load required data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Update available key accounts for the dropdown using allKeyAccounts
  useEffect(() => {
    console.log('Updating available key accounts');
    console.log('allKeyAccounts:', allKeyAccounts);
    console.log('accountEntries:', accountEntries);
    
    if (allKeyAccounts && allKeyAccounts.length > 0) {
      // Get IDs of accounts that have already been added to the request
      const selectedIds = accountEntries.map(entry => entry.key_account_id);
      console.log('Selected IDs:', selectedIds);
      
      // Filter out already added accounts from the available options
      const available = allKeyAccounts.filter(
        account => !selectedIds.includes(account.id)
      );
      
      console.log('Available accounts for dropdown:', available);
      setAvailableKeyAccounts(available);
      
      // Clear any previous errors if we have available accounts
      if (available.length > 0) {
        setError(null);
      }
    } else if (keyAccounts && keyAccounts.length > 0) {
      // Fallback to context keyAccounts if allKeyAccounts is empty
      const selectedIds = accountEntries.map(entry => entry.key_account_id);
      const available = keyAccounts.filter(
        account => !selectedIds.includes(account.id)
      );
      setAvailableKeyAccounts(available);
      
      if (available.length > 0) {
        setError(null);
      }
    } else {
      setAvailableKeyAccounts([]);
    }
  }, [allKeyAccounts, accountEntries, keyAccounts]);

  // Update department key accounts
  useEffect(() => {
    console.log('budgetMasterData:', budgetMasterData);
    console.log('budgetMasterData type:', typeof budgetMasterData);
    console.log('budgetMasterData isArray:', Array.isArray(budgetMasterData));
    if (selectedDepartment && budgetMasterData.length > 0) {
      const departmentAccounts = budgetMasterData.filter(item => 
        String(item.department) === String(selectedDepartment) ||
        (item.department_name && departmentName && 
         item.department_name.toLowerCase() === departmentName.toLowerCase())
      );
      console.log('departmentAccounts:', departmentAccounts);
      setDepartmentKeyAccounts(departmentAccounts);
      
      if (accountEntries.length === 0 && !isSubmitted) {
        const groupedAccounts = {};
        departmentAccounts.forEach(account => {
          if (!groupedAccounts[account.key_account]) {
            groupedAccounts[account.key_account] = {
              key_account_id: account.key_account,
              key_account_name: account.key_account_name,
              amount: account.amount && parseFloat(account.amount) > 0 ? account.amount : '',
              reason: '',
              available: getAvailableAmount(account.key_account),
              type: account.type,
              total: parseFloat(account.overall) || 0
            };
          } else {
            groupedAccounts[account.key_account].total += parseFloat(account.amount) || 0;
          }
        });
        const newEntries = Object.values(groupedAccounts);
        console.log('Setting accountEntries:', newEntries);
        setAccountEntries(newEntries);
      }
    }
  }, [selectedDepartment, budgetMasterData, isSubmitted, accountEntries.length, departmentName]);

  const getAvailableAmount = (accountId) => {
    if (!accountId) return 0;
    const account = accountsWithUsage.find(a => a.id === accountId) || 
                   keyAccounts.find(a => a.id === accountId) ||
                   allKeyAccounts.find(a => a.id === accountId);
    if (account) {
      return account.available_amount ?? (account.total_budget - (account.used_amount || 0));
    }
    return 0;
  };

  const loadDepartmentData = async (departmentId) => {
    setFormData({
      ...formData,
      department_id: departmentId,
      version: 1,
      status: 'pending',
      request_id: null
    });
    setSelectedDepartment(departmentId);
    setAccountEntries([]);
    setIsSubmitted(false);
    setSuccess(null);
    setError(null);
    setBudgetMasterData([]);
    
    if (departmentId) {
      try {
        setIsLoading(true);
        
        // Fetch ALL key accounts separately for the dropdown
        try {
          const accounts = await keyAccountService.getAllKeyAccounts();
          console.log('Fetched key accounts in loadDepartmentData:', accounts);
          if (accounts && accounts.length > 0) {
            setAllKeyAccounts(accounts);
          }
        } catch (kaError) {
          console.error('Error fetching key accounts in loadDepartmentData:', kaError);
        }
        
        // Get department budget data
        let budgetData = [];
        let attempt = 0;
        const maxAttempts = 3;
        
        while (attempt < maxAttempts && budgetData.length === 0) {
          try {
            if (attempt === 0) {
              budgetData = await creditService.getDepartmentBudgetMasterData(departmentId);
            } else if (attempt === 1) {
              const allBudgetData = await creditService.getBudgetMasterData();
              budgetData = allBudgetData.filter(item => 
                String(item.department) === String(departmentId) ||
                (item.department_name && departmentName && 
                 item.department_name.toLowerCase() === departmentName.toLowerCase())
              );
            } else {
              if (!departmentName && departmentId) {
                const deptInfo = await departmentService.getDepartmentById(departmentId);
                if (deptInfo && deptInfo.name) {
                  setDepartmentName(deptInfo.name);
                  const allBudgetData = await creditService.getBudgetMasterData();
                  budgetData = allBudgetData.filter(item => 
                    item.department_name && deptInfo.name &&
                    item.department_name.toLowerCase() === deptInfo.name.toLowerCase()
                  );
                }
              }
            }
          } catch (err) {
            console.error(`Attempt ${attempt + 1} failed:`, err);
          }
          attempt++;
        }
        
        if (!budgetData || budgetData.length === 0) {
          const [keyAccountsResponse, departmentsData] = await Promise.all([
            keyAccountService.getAllKeyAccounts(),
            departmentService.getAllDepartments()
          ]);
          
          // Store ALL key accounts for the dropdown
          if (keyAccountsResponse && keyAccountsResponse.length > 0) {
            setAllKeyAccounts(keyAccountsResponse);
          }
          
          const keyAccountsData = keyAccountsResponse || [];
          const deptName = departmentName || departmentsData.find(d => d.id == departmentId)?.name || '';
          if (deptName) setDepartmentName(deptName);
          
          budgetData = keyAccountsData
            .filter(account => !account.department_id || account.department_id == departmentId)
            .map(account => ({
              type: account.account_type || 'Unknown',
              key_account: account.id,
              key_account_name: account.name,
              overall: account.total_budget || 0,
              department: departmentId,
              department_name: deptName || `Department ${departmentId}`,
              amount: 0.0000
            }));
        }
        
        console.log('Setting budgetMasterData:', budgetData);
        setBudgetMasterData(budgetData);
      } catch (err) {
        console.error('Error in loadDepartmentData:', err);
        setError('Failed to load budget data for this department');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAccountAmountChange = (index, value) => {
    const updatedEntries = [...accountEntries];
    updatedEntries[index].amount = value;
    setAccountEntries(updatedEntries);
  };

  const handleAccountReasonChange = (index, value) => {
    const updatedEntries = [...accountEntries];
    updatedEntries[index].reason = value;
    setAccountEntries(updatedEntries);
  };

  const addKeyAccount = (accountId) => {
    // Prevent duplicates
    if (accountEntries.some(entry => entry.key_account_id === accountId)) {
      setError('This account is already added to your request.');
      return;
    }
    
    // Look for the account in all possible sources
    let account = null;
    
    // First try allKeyAccounts (most complete)
    if (allKeyAccounts && allKeyAccounts.length > 0) {
      account = allKeyAccounts.find(acc => acc.id === accountId);
    }
    
    // Then try context keyAccounts
    if (!account && keyAccounts && keyAccounts.length > 0) {
      account = keyAccounts.find(acc => acc.id === accountId);
    }
    
    // Then try availableKeyAccounts
    if (!account && availableKeyAccounts && availableKeyAccounts.length > 0) {
      account = availableKeyAccounts.find(acc => acc.id === accountId);
    }
    
    // Finally try accountsWithUsage
    if (!account && accountsWithUsage && accountsWithUsage.length > 0) {
      account = accountsWithUsage.find(acc => acc.id === accountId);
    }
    
    if (account) {
      const newEntry = {
        key_account_id: account.id,
        key_account_name: account.name,
        amount: '',
        reason: '',
        available: getAvailableAmount(account.id),
        type: account.account_type || 'Unknown',
        total: parseFloat(account.total_budget) || 0
      };
      
      console.log('Adding new key account entry:', newEntry);
      setAccountEntries([...accountEntries, newEntry]);
      setError(null);
    } else {
      console.error(`Could not find account data for ID: ${accountId}`);
      setError(`Could not find account with ID: ${accountId}. Please try refreshing the page.`);
    }
  };

  const removeKeyAccount = (index) => {
    const updatedEntries = [...accountEntries];
    updatedEntries.splice(index, 1);
    setAccountEntries(updatedEntries);
  };

// Updated handleSubmit function in NewCreditRequest.js
const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('handleSubmit called');
  console.log('formData:', formData);
  console.log('accountEntries:', accountEntries);
  
  if (!formData.department_id) {
    setError('Please select a department');
    console.log('Error: No department_id');
    return;
  }
  
  // Modified validation to allow zero values
  const validEntries = accountEntries.filter(
    entry => entry.key_account_id && 
            entry.amount !== '' && 
            !isNaN(parseFloat(entry.amount)) &&
            parseFloat(entry.amount) >= 0
  );
  
  console.log('validEntries:', validEntries);
  
  if (validEntries.length === 0) {
    setError('Please add at least one account with a valid amount');
    console.log('Error: No valid entries');
    return;
  }
  
  try {
    setIsSubmitting(true);
    setError(null);
    
    const payload = {
      department_id: parseInt(formData.department_id),
      entries: validEntries.map(entry => ({
        key_account_id: entry.key_account_id,
        amount: parseFloat(entry.amount),
        reason: entry.reason || '',
      })),
      version: formData.version || 1,
      status: 'pending'
    };
    
    console.log('Submitting payload:', payload);
    const response = await creditService.createCreditRequest(payload);
    console.log('Submission response:', response);
    setSuccess('Credit request submitted successfully!');
    setIsSubmitted(true);
    
    if (response.requestId || response.id || (response.entries && response.entries.length > 0)) {
      const requestId = response.requestId || response.id || response.entries[0].id;
      setFormData(prev => ({
        ...prev,
        request_id: requestId,
        status: 'pending'
      }));
    }
    
    setTimeout(() => {
      navigate('/credit-history');
    }, 3000);
  } catch (err) {
    console.error('Error in handleSubmit:', err);
    setError(err.message || 'Failed to submit credit request');
  } finally {
    setIsSubmitting(false);
  }
};
  const startNewRequest = () => {
    const deptId = currentUser.departments?.[0]?.id || currentUser.department_id || selectedDepartment || '';
    setFormData({
      department_id: deptId,
      version: 1,
      status: 'pending',
      request_id: null,
    });
    setAccountEntries([]);
    setIsSubmitted(false);
    setSuccess(null);
    setError(null);
    if (deptId) loadDepartmentData(deptId);
  };

  if (!currentUser || !currentUser.id) {
    return (
      <div className="flex-1 p-8 ml-64 flex justify-center items-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-8 ml-64 flex justify-center items-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const accountsByType = accountEntries.reduce((groups, account) => {
    const type = account.type || 'Uncategorized';
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {});

  return (
    <div className="flex-1 p-8 ml-64">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">New Credit Request</h1>
        {isSubmitted && (
          <button
            type="button"
            onClick={startNewRequest}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Start New Request
          </button>
        )}
      </div>

      {error && <AlertMessage type="error" message={error} />}
      {success && <AlertMessage type="success" message={success} />}

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="department_id" className="block text-sm font-medium text-gray-700">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 text-sm py-2 px-3 bg-gray-100 border border-gray-300 rounded-md">
                {departmentName || 'Loading department...'}
                <input type="hidden" name="department_id" value={formData.department_id} />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                You can only submit requests for your assigned department
              </p>
            </div>
            <div className="flex items-end">
              <p className="text-sm font-medium text-gray-700">
                Total Request Amount: <span className="font-bold text-lg text-indigo-600">{formatCurrency(totalAmount)}</span>
              </p>
            </div>
          </div>

          <div className="mt-8 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Department Key Accounts</h2>
            </div>

            {formData.department_id ? (
              <div>
                {Object.keys(accountsByType).length > 0 ? (
                  <div className="space-y-6">
                    {Object.keys(accountsByType).map(type => (
                      <div key={type} className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                          <h3 className="text-md font-medium text-gray-700">{type}</h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {accountsByType[type].map((entry, index) => {
                            const entryIndex = accountEntries.findIndex(e => e.key_account_id === entry.key_account_id);
                            return (
                              <div key={entry.key_account_id} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Key Account
                                    </label>
                                    <div className="mt-1 text-sm text-gray-900 py-2 px-3 bg-gray-100 border border-gray-300 rounded-md">
                                      {entry.key_account_id} - {entry.key_account_name}
                                    </div>
                                  </div>
                                  <div>
                                    <label
                                      htmlFor={`amount-${entryIndex}`}
                                      className="block text-sm font-medium text-gray-700"
                                    >
                                      Amount <span className="text-red-500">*</span>
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">฿</span>
                                      </div>
                                      <input
                                        type="number"
                                        id={`amount-${entryIndex}`}
                                        value={entry.amount || ''}
                                        onChange={(e) => handleAccountAmountChange(entryIndex, e.target.value)}
                                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        disabled={isSubmitted}
                                        required
                                      />
                                    </div>
                                    {entry.available !== undefined && (
                                      <p className="mt-1 text-xs text-gray-500">
                                        Available Credit: {formatCurrency(entry.available)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-between items-start">
                                  <div className="flex-grow mr-3">
                                    <label
                                      htmlFor={`reason-${entryIndex}`}
                                      className="block text-sm font-medium text-gray-700"
                                    >
                                      Reason
                                    </label>
                                    <textarea
                                      id={`reason-${entryIndex}`}
                                      rows={2}
                                      value={entry.reason || ''}
                                      onChange={(e) => handleAccountReasonChange(entryIndex, e.target.value)}
                                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                      placeholder="Please provide a detailed reason for this account request (optional)"
                                      disabled={isSubmitted}
                                    />
                                  </div>
                                  {!isSubmitted && (
                                    <button
                                      type="button"
                                      onClick={() => removeKeyAccount(entryIndex)}
                                      className="mt-6 p-1 text-red-600 hover:text-red-800 bg-white border border-red-300 rounded-md px-3 py-1 text-sm"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {!isSubmitted && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-grow">
                            <label htmlFor="add-account" className="block text-sm font-medium text-gray-700 mb-1">
                              Add Another Key Account
                            </label>
                            {allKeyAccounts && allKeyAccounts.length > 0 ? (
                              <select
                                id="add-account"
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    addKeyAccount(e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                              >
                                <option value="" disabled>
                                  Select an account to add ({availableKeyAccounts.length} available)
                                </option>
                                {availableKeyAccounts.map(account => (
                                  <option key={account.id} value={account.id}>
                                    {account.id} - {account.name} {account.account_type ? `(${account.account_type})` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="mt-1 p-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500">
                                {!allKeyAccounts || allKeyAccounts.length === 0
                                  ? 'No key accounts available in the system.'
                                  : accountEntries.length > 0 
                                    ? 'All available accounts have been added to this request.'
                                    : 'Loading available accounts...'}
                              </div>
                            )}
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              disabled={availableKeyAccounts.length === 0}
                              onClick={() => {
                                const select = document.getElementById('add-account');
                                if (select && select.value) {
                                  addKeyAccount(select.value);
                                  select.value = "";
                                }
                              }}
                              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                                availableKeyAccounts.length > 0
                                  ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                                  : 'text-gray-500 bg-gray-200 cursor-not-allowed'
                              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                            >
                              Add Account
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">
                      No key accounts found for this department. You can add accounts using the dropdown below.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">Loading department data...</p>
              </div>
            )}
          </div>

          {!isSubmitted && (
                        <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          onClick={() => navigate('/dashboard')}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || accountEntries.length === 0}
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          {isSubmitting ? <LoadingSpinner /> : 'Submit Request'}
                        </button>
                      </div>
                    )}
                  </form>
                </div>
          
                {(formData.version > 1 || formData.request_id) && (
                  <div className="mt-6 bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Request Version History</h2>
                    <div className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">Version {formData.version}</span>
                            <span className="ml-2 text-sm text-gray-500">Current ({formData.status})</span>
                          </div>
                          <span className="text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                      {formData.version > 1 && (
                        <div className="p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">Version {formData.version - 1}</span>
                              <span className="ml-2 text-sm text-yellow-600">Revision Requested</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              Date: {new Date(Date.now() - 86400000).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                          {formData.feedback && (
                            <p className="mt-2 text-sm text-gray-600">
                              Admin feedback: {formData.feedback}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          };
          
          export default NewCreditRequest;