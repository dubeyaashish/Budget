// frontend/src/components/user/NewCreditRequest.js
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

  const navigate = useNavigate();

  // Calculate total amount
  const totalAmount = accountEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);

  // Function to find department ID from department name
  const findDepartmentIdByName = (deptName, deptsList) => {
    if (!deptName || !deptsList || !deptsList.length) return null;
    
    // Case-insensitive exact match
    const exactMatch = deptsList.find(
      d => d.name.toLowerCase() === deptName.toLowerCase()
    );
    if (exactMatch) return exactMatch.id;
    
    // Partial match (department name contains part of the search or vice versa)
    const partialMatch = deptsList.find(
      d => d.name.toLowerCase().includes(deptName.toLowerCase()) || 
           deptName.toLowerCase().includes(d.name.toLowerCase())
    );
    if (partialMatch) return partialMatch.id;
    
    return null;
  };

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
        
        // Get all departments first
        const departmentsData = await departmentService.getAllDepartments();
        setDepartments(departmentsData);
        
        // Determine the user's department ID
        let userDeptId = null;
        let userDeptName = null;
        
        // STEP 1: Check all possible places where department info might be stored
        if (currentUser.department_id) {
          // If department_id is directly available
          userDeptId = currentUser.department_id;
          console.log(`Found department_id in user object: ${userDeptId}`);
          
          // Find department name for display
          const deptInfo = departmentsData.find(d => d.id == userDeptId);
          if (deptInfo) {
            userDeptName = deptInfo.name;
          }
        } 
        else if (currentUser.departments && currentUser.departments.length > 0) {
          // If there's a departments array
          userDeptId = currentUser.departments[0].id;
          userDeptName = currentUser.departments[0].name;
          console.log(`Found department in departments array: ${userDeptId} (${userDeptName})`);
        } 
        else if (currentUser.department) {
          // If only department name is available, find the ID
          userDeptName = currentUser.department;
          console.log(`Found department name in user object: ${userDeptName}`);
          
          userDeptId = findDepartmentIdByName(userDeptName, departmentsData);
          if (userDeptId) {
            console.log(`Matched department name to ID: ${userDeptId}`);
          }
        }
        
        // STEP 2: If we still don't have a department, try to get it from the user profile
        if (!userDeptId) {
          try {
            console.log('Attempting to fetch user profile for department info');
            const userProfile = await authService.getProfile();
            
            if (userProfile.department_id) {
              userDeptId = userProfile.department_id;
              console.log(`Found department_id from profile API: ${userDeptId}`);
              
              // Find department name for display
              const deptInfo = departmentsData.find(d => d.id == userDeptId);
              if (deptInfo) {
                userDeptName = deptInfo.name;
              }
            } 
            else if (userProfile.department) {
              userDeptName = userProfile.department;
              console.log(`Found department name from profile API: ${userDeptName}`);
              
              userDeptId = findDepartmentIdByName(userDeptName, departmentsData);
              if (userDeptId) {
                console.log(`Matched profile department name to ID: ${userDeptId}`);
              }
            }
          } catch (profileErr) {
            console.error('Error fetching user profile:', profileErr);
          }
        }
        
        // STEP 3: Final fallback - if we have a name but no ID, try looking it up directly
        if (userDeptName && !userDeptId) {
          try {
            const deptByName = await departmentService.findDepartmentByName(userDeptName);
            if (deptByName && deptByName.id) {
              userDeptId = deptByName.id;
              console.log(`Found department ID via direct lookup: ${userDeptId}`);
            }
          } catch (lookupErr) {
            console.error('Error in direct department lookup:', lookupErr);
          }
        }
        
        // STEP 4: Set the department info for the component
        if (userDeptId) {
          setSelectedDepartment(userDeptId);
          
          if (userDeptName) {
            setDepartmentName(userDeptName);
          } else {
            // If we only have ID but no name, look up the name
            const deptInfo = departmentsData.find(d => d.id == userDeptId);
            if (deptInfo) {
              setDepartmentName(deptInfo.name);
            } else {
              setDepartmentName(`Department ${userDeptId}`);
            }
          }
          
          setFormData(prev => ({ ...prev, department_id: userDeptId }));
          
          // Load budget data for this department
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

  // Update available key accounts when department or entries change
  useEffect(() => {
    const filterAvailableAccounts = () => {
      if (departmentKeyAccounts.length > 0) {
        // Get the IDs of accounts already selected
        const selectedIds = accountEntries.map(entry => entry.key_account_id);
        
        // Filter available accounts to those not already selected
        const available = departmentKeyAccounts.filter(
          account => !selectedIds.includes(account.key_account)
        );

        setAvailableKeyAccounts(available);
      }
    };
    
    filterAvailableAccounts();
  }, [departmentKeyAccounts, accountEntries]);

  // Update department key accounts when department or budget data changes
  useEffect(() => {
    console.log('useEffect for department key accounts triggered');
    console.log('Selected department:', selectedDepartment);
    console.log('Budget master data length:', budgetMasterData.length);
    
    if (selectedDepartment && budgetMasterData.length > 0) {
      console.log(`Filtering budget data for department ID: ${selectedDepartment}`);
      
      // More verbose logging for filtering
      const departmentAccounts = budgetMasterData.filter(item => {
        // Try multiple match strategies
        
        // Strategy 1: Direct ID match (converting both to strings for safety)
        const itemDeptId = String(item.department || '');
        const selectedDeptId = String(selectedDepartment || '');
        const directMatch = itemDeptId === selectedDeptId;
        
        if (directMatch) {
          return true;
        }
        
        // Strategy 2: Match by department name if available
        if (item.department_name && departmentName) {
          const itemDeptName = String(item.department_name || '').toLowerCase();
          const deptNameLower = departmentName.toLowerCase();
          
          // Exact name match
          if (itemDeptName === deptNameLower) {
            return true;
          }
          
          // Partial name match
          if (itemDeptName.includes(deptNameLower) || deptNameLower.includes(itemDeptName)) {
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`Found ${departmentAccounts.length} accounts for department ID: ${selectedDepartment}`);
      console.log('Department accounts:', departmentAccounts);
      
      setDepartmentKeyAccounts(departmentAccounts);
      
      // Pre-populate account entries if none exist yet or if department changed
      if (accountEntries.length === 0 && !isSubmitted) {
        console.log('Creating account entries from department accounts');
        const groupedAccounts = {};
        
        departmentAccounts.forEach(account => {
          console.log('Processing account:', account);
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
        console.log('Created account entries:', newEntries);
        
        setAccountEntries(newEntries);
      }
    }
  }, [selectedDepartment, budgetMasterData, isSubmitted, accountEntries.length, departmentName]);

  const getAvailableAmount = (accountId) => {
    if (!accountId) return 0;
    
    const account = accountsWithUsage.find(a => a.id === accountId);
    if (account && account.available_amount !== undefined) {
      return account.available_amount;
    }
    
    const basicAccount = keyAccounts.find(a => a.id === accountId);
    if (basicAccount) {
      return basicAccount.total_budget - (basicAccount.used_amount || 0);
    }
    
    return 0;
  };

  const loadDepartmentData = async (departmentId) => {
    console.log(`Loading data for department ID: ${departmentId}`);
    
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
    
    // Clear any existing budget data
    setBudgetMasterData([]);
    
    if (departmentId) {
      try {
        setIsLoading(true);
        
        // Try to get data from the specific department endpoint
        console.log(`Fetching budget data for department ID: ${departmentId}`);
        let budgetData = [];
        let attempt = 0;
        const maxAttempts = 3;
        
        while (attempt < maxAttempts && budgetData.length === 0) {
          try {
            if (attempt > 0) {
              console.log(`Retry attempt ${attempt} for department budget data`);
            }
            
            if (attempt === 0) {
              // First attempt: Try the dedicated endpoint
              budgetData = await creditService.getDepartmentBudgetMasterData(departmentId);
            } else if (attempt === 1) {
              // Second attempt: Try to filter from all budget data
              const allBudgetData = await creditService.getBudgetMasterData();
              budgetData = allBudgetData.filter(item => 
                String(item.department) === String(departmentId) ||
                (item.department_name && departmentName && 
                 item.department_name.toLowerCase() === departmentName.toLowerCase())
              );
            } else {
              // Third attempt: Look up department name if we only have ID
              if (!departmentName && departmentId) {
                try {
                  const deptInfo = await departmentService.getDepartmentById(departmentId);
                  if (deptInfo && deptInfo.name) {
                    setDepartmentName(deptInfo.name);
                    
                    // Try to match by name in the budget data
                    const allBudgetData = await creditService.getBudgetMasterData();
                    budgetData = allBudgetData.filter(item => 
                      item.department_name && deptInfo.name &&
                      (item.department_name.toLowerCase() === deptInfo.name.toLowerCase() ||
                       item.department_name.toLowerCase().includes(deptInfo.name.toLowerCase()) ||
                       deptInfo.name.toLowerCase().includes(item.department_name.toLowerCase()))
                    );
                  }
                } catch (deptErr) {
                  console.error('Error fetching department details:', deptErr);
                }
              }
            }
            
            console.log(`Retrieved ${budgetData?.length || 0} budget records for department ${departmentId}:`, budgetData);
          } catch (err) {
            console.error(`Attempt ${attempt + 1} failed:`, err);
          }
          
          attempt++;
        }
        
        // If still no data, use fallback approach
        if (!budgetData || budgetData.length === 0) {
          console.log('Using fallback key accounts approach');
          
          // Get key accounts and departments
          try {
            console.log('Fetching key accounts for fallback');
            const [keyAccountsData, departmentsData] = await Promise.all([
              keyAccountService.getAllKeyAccounts(),
              departmentService.getAllDepartments()
            ]);
            
            // Find the department name if we don't have it yet
            let deptName = departmentName;
            if (!deptName) {
              const departmentInfo = departmentsData.find(d => d.id == departmentId) || {};
              deptName = departmentInfo.name || '';
              
              if (deptName) {
                setDepartmentName(deptName);
              }
            }
            
            // Generate fallback data
            budgetData = keyAccountsData.map(account => ({
              type: account.account_type || 'Unknown',
              key_account: account.id,
              key_account_name: account.name,
              overall: account.total_budget || 0,
              department: departmentId,
              department_name: deptName || `Department ${departmentId}`,
              amount: 0.0000
            }));
            
            console.log(`Generated ${budgetData.length} fallback records`);
          } catch (fallbackErr) {
            console.error('Error with fallback approach:', fallbackErr);
            
            // Last resort - minimal fallback data
            budgetData = [
              {
                type: 'Expense',
                key_account: 'EXP001',
                key_account_name: 'Office Expenses',
                overall: 100000,
                department: departmentId,
                department_name: departmentName || `Department ${departmentId}`,
                amount: 0.0000
              },
              {
                type: 'Asset',
                key_account: 'AST001',
                key_account_name: 'Equipment',
                overall: 200000,
                department: departmentId,
                department_name: departmentName || `Department ${departmentId}`,
                amount: 0.0000
              }
            ];
            console.log('Using minimal fallback data');
          }
        }
        
        // Store the budget data (either real or fallback)
        console.log(`Setting ${budgetData.length} budget records to state`);
        setBudgetMasterData(budgetData);
        
      } catch (err) {
        console.error('Error in department change handler:', err);
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

  // Add a new key account to entries
  const addKeyAccount = (accountId) => {
    const account = availableKeyAccounts.find(acc => acc.key_account === accountId);
    if (account) {
      const newEntry = {
        key_account_id: account.key_account,
        key_account_name: account.key_account_name,
        amount: '',
        reason: '',
        available: getAvailableAmount(account.key_account),
        type: account.type || 'Unknown',
        total: parseFloat(account.overall) || 0
      };
      setAccountEntries([...accountEntries, newEntry]);
    }
  };

  // Remove a key account from entries
  const removeKeyAccount = (index) => {
    const updatedEntries = [...accountEntries];
    updatedEntries.splice(index, 1);
    setAccountEntries(updatedEntries);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit button clicked");
    
    // Basic validation with visible error messages
    if (!formData.department_id) {
      setError('Please select a department');
      return;
    }

    // Check for at least one valid entry
    const validEntries = accountEntries.filter(
      (entry) => entry.key_account_id && 
               entry.amount && 
               parseFloat(entry.amount) > 0 && 
               entry.reason
    );

    console.log("Valid entries:", validEntries);

    if (validEntries.length === 0) {
      setError('Please add at least one account with a valid amount and reason');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Create payload with explicit status set to 'pending'
      const payload = {
        department_id: parseInt(formData.department_id),
        entries: validEntries.map(entry => ({
          key_account_id: entry.key_account_id,
          amount: parseFloat(entry.amount),
          reason: entry.reason,
        })),
        version: formData.version || 1,
        status: 'pending'
      };

      console.log('Submitting credit request with payload:', payload);
      
      // Make the API call with explicit error handling
      try {
        const response = await creditService.createCreditRequest(payload);
        console.log('Credit request response:', response);
        
        setSuccess('Credit request submitted successfully!');
        setIsSubmitted(true);
        
        // Store request ID if available in response
        if (response.requestId || response.id || (response.entries && response.entries.length > 0)) {
          const requestId = response.requestId || response.id || response.entries[0].id;
          setFormData(prev => ({
            ...prev,
            request_id: requestId,
            status: 'pending'
          }));
        }
        
        // Show success message for 3 seconds then navigate to credit history
        setTimeout(() => {
          navigate('/credit-history');
        }, 3000);
      } catch (apiError) {
        console.error('API Error:', apiError);
        setError(apiError.message || 'Error communicating with server');
      }
    } catch (err) {
      console.error('General error in submit handler:', err);
      setError(err.message || 'Failed to submit credit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startNewRequest = () => {
    // Determine department ID from currentUser
    let deptId = '';
    if (currentUser.departments && currentUser.departments.length > 0) {
      deptId = currentUser.departments[0].id;
    } else if (currentUser.department_id) {
      deptId = currentUser.department_id;
    } else if (selectedDepartment) {
      deptId = selectedDepartment;
    }

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
    
    // Reload department data
    if (deptId) {
      loadDepartmentData(deptId);
    }
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

  // Group accounts by type for display
  const accountsByType = accountEntries.reduce((groups, account) => {
    if (!account.type) account.type = 'Uncategorized';
    if (!groups[account.type]) groups[account.type] = [];
    groups[account.type].push(account);
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
                {/* Display accounts grouped by type */}
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
                                      {entry.total > 0 && (
                                        <span className="block mt-1 text-xs text-gray-500">
                                          Total Budget: {formatCurrency(entry.total)}
                                        </span>
                                      )}
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
                                      Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                      id={`reason-${entryIndex}`}
                                      rows={2}
                                      value={entry.reason || ''}
                                      onChange={(e) => handleAccountReasonChange(entryIndex, e.target.value)}
                                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                      placeholder="Please provide a detailed reason for this account request"
                                      disabled={isSubmitted}
                                      required
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
                    
                    {/* Dropdown to add more key accounts */}
                    {!isSubmitted && availableKeyAccounts.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex items-center">
                          <select 
                            className="form-select mr-2 flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                addKeyAccount(e.target.value);
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="" disabled>Add another key account...</option>
                            {availableKeyAccounts.map(account => (
                              <option key={account.key_account} value={account.key_account}>
                                {account.key_account_name} ({account.type || 'Unknown'})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const select = document.querySelector('select.form-select');
                              if (select && select.value) {
                                addKeyAccount(select.value);
                                select.value = "";
                              }
                            }}
                            className="ml-2 p-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">
                      No key accounts found for this department. Please contact an administrator.
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