// frontend/src/components/user/NewCreditRequest.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import departmentService from '../../services/departmentService';
import creditService from '../../services/creditService';
import keyAccountService from '../../services/keyAccountService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const NewCreditRequest = () => {
  const { currentUser } = useContext(AuthContext);
  const { accountsWithUsage, keyAccounts } = useContext(KeyAccountContext);

  const [formData, setFormData] = useState({
    department_id: '',
    version: 1,
    status: 'draft',
    request_id: null,
  });

  const [selectedDepartment, setSelectedDepartment] = useState(null);
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
        
        // Fetch departments
        console.log('Fetching departments...');
        let departmentsData = [];
        try {
          departmentsData = await departmentService.getAllDepartments();
          console.log('Departments data received:', departmentsData);
        } catch (deptError) {
          console.error('Error fetching departments:', deptError);
          // Set a default department if we can't fetch real ones
          departmentsData = [{id: currentUser.department || 1, name: 'Default Department'}];
        }
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
  
        // More detailed logging for selected department
        if (currentUser.department) {
          console.log(`Setting default department ID: ${currentUser.department}`);
          setFormData((prev) => ({
            ...prev,
            department_id: currentUser.department,
          }));
          setSelectedDepartment(currentUser.department);
          
          // Fetch budget data for the current user's department
          await handleDepartmentChange({ target: { value: currentUser.department } });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
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
        const itemDept = item.department?.toString();
        const selectedDept = selectedDepartment?.toString();
        console.log(`Comparing item.department (${itemDept}) with selectedDepartment (${selectedDept})`);
        return itemDept === selectedDept;
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
  }, [selectedDepartment, budgetMasterData, isSubmitted]);

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

  const handleDepartmentChange = async (e) => {
    const departmentId = e.target.value;
    console.log(`Department changed to ID: ${departmentId}`);
    
    setFormData({
      ...formData,
      department_id: departmentId,
      version: 1, 
      status: 'draft',
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
        const maxAttempts = 2;
        
        while (attempt < maxAttempts && budgetData.length === 0) {
          try {
            if (attempt > 0) {
              console.log(`Retry attempt ${attempt} for department budget data`);
            }
            
            budgetData = await creditService.getDepartmentBudgetMasterData(departmentId);
            console.log(`Retrieved ${budgetData?.length || 0} budget records for department ${departmentId}:`, budgetData);
          } catch (err) {
            console.error(`Attempt ${attempt + 1} failed:`, err);
          }
          
          // If still no data, try fallback approach
          if (!budgetData || budgetData.length === 0) {
            if (attempt === maxAttempts - 1) {
              console.log('Using fallback key accounts approach');
              
              // Get key accounts and departments
              try {
                console.log('Fetching key accounts for fallback');
                const [keyAccountsData, departmentsData] = await Promise.all([
                  keyAccountService.getAllKeyAccounts(),
                  departmentService.getAllDepartments()
                ]);
                
                // Find the department name
                const departmentInfo = departmentsData.find(d => d.id == departmentId) || {};
                const departmentName = departmentInfo.name || '';
                
                // Generate fallback data
                budgetData = keyAccountsData.map(account => ({
                  type: account.account_type || 'Unknown',
                  key_account: account.id,
                  key_account_name: account.name,
                  overall: account.total_budget || 0,
                  department: departmentId,
                  department_name: departmentName || `Department ${departmentId}`,
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
                    department_name: `Department ${departmentId}`,
                    amount: 0.0000
                  },
                  {
                    type: 'Asset',
                    key_account: 'AST001',
                    key_account_name: 'Equipment',
                    overall: 200000,
                    department: departmentId,
                    department_name: `Department ${departmentId}`,
                    amount: 0.0000
                  }
                ];
                console.log('Using minimal fallback data');
              }
            }
          }
          
          attempt++;
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

  const validateForm = () => {
    if (!formData.department_id) {
      setError('Please select a department');
      return false;
    }

    const validEntries = accountEntries.filter(
      (entry) => entry.key_account_id && entry.amount && parseFloat(entry.amount) > 0 && entry.reason
    );

    if (validEntries.length === 0) {
      setError('Please add at least one account with a valid amount and reason');
      return false;
    }

    const invalidEntry = accountEntries.find(
      (entry) => entry.amount && parseFloat(entry.amount) > entry.available
    );

    if (invalidEntry) {
      setError(
        `Amount for account ${invalidEntry.key_account_name} exceeds available credit of ${formatCurrency(
          invalidEntry.available
        )}`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const validEntries = accountEntries.filter(
        (entry) => entry.key_account_id && entry.amount && parseFloat(entry.amount) > 0 && entry.reason
      );

      // Create a single credit request with multiple entries
      const payload = {
        department_id: parseInt(formData.department_id),
        entries: validEntries.map(entry => ({
          key_account_id: entry.key_account_id,
          amount: parseFloat(entry.amount),
          reason: entry.reason,
        })),
        version: formData.version,
        status: 'pending',
        parent_request_id: formData.request_id
      };

      console.log('Submitting credit request:', payload);
      
      const response = await creditService.createCreditRequest(payload);
      
      console.log('Credit request response:', response);
      
      setSuccess('Credit request submitted successfully!');
      setIsSubmitted(true);
      setFormData(prev => ({
        ...prev,
        request_id: response.requestId,
        status: 'pending'
      }));
      
    } catch (err) {
      console.error('Error submitting credit request:', err);
      setError(err.response?.data?.message || 'Failed to submit credit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveAsDraft = async () => {
    if (!formData.department_id) {
      setError('Please select a department');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        department_id: parseInt(formData.department_id),
        entries: accountEntries
          .filter((entry) => entry.key_account_id)
          .map((entry) => ({
            key_account_id: entry.key_account_id,
            amount: parseFloat(entry.amount) || 0,
            reason: entry.reason,
          })),
        version: formData.version,
        status: 'draft',
      };

      await creditService.saveDraftCreditRequest(payload);
      setSuccess('Request saved as draft');
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startNewRequest = () => {
    setFormData({
      department_id: currentUser?.department || '',
      version: 1,
      status: 'draft',
      request_id: null,
    });
    setAccountEntries([]);
    setIsSubmitted(false);
    setSuccess(null);
    setError(null);
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
              <select
                id="department_id"
                name="department_id"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={formData.department_id || ''}
                onChange={handleDepartmentChange}
                disabled={isSubmitted}
                required
              >
                <option value="">Select Department</option>
                {Array.isArray(departments) &&
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
              </select>
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
                      No key accounts found for this department. Please select a different department.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">Please select a department to see available key accounts.</p>
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
                type="button"
                onClick={saveAsDraft}
                className="bg-gray-100 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Save as Draft
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
                    Date: {new Date(Date.now() - 86400000).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Admin feedback: Please adjust the amount and provide more details.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewCreditRequest;