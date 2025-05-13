// frontend/src/components/admin/AdminCreditRequestCreation.js
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
import { NumericFormat } from 'react-number-format';

const AdminCreditRequestCreation = () => {
  const { currentUser } = useContext(AuthContext);
  const { accountsWithUsage, keyAccounts } = useContext(KeyAccountContext);

  const [formData, setFormData] = useState({
    department_id: '',
    version: 1,
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

  // Fetch the initial data when component mounts
  useEffect(() => {
    const fetchData = async () => {
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
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Failed to load required data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const handleDepartmentChange = async (e) => {
    const deptId = e.target.value;
    if (!deptId) return;
    
    setFormData({
      ...formData,
      department_id: deptId
    });
    
    setSelectedDepartment(deptId);
    
    // Get department name
    const dept = departments.find(d => d.id == deptId);
    if (dept) {
      setDepartmentName(dept.name);
    }
    
    setAccountEntries([]);
    setIsSubmitted(false);
    setSuccess(null);
    setError(null);
    setBudgetMasterData([]);
    
    if (deptId) {
      try {
        setIsLoading(true);
        
        // Get department budget data
        const budgetData = await creditService.getDepartmentBudgetMasterData(deptId);
        console.log('Budget data for department:', budgetData);
        setBudgetMasterData(budgetData);
        
        if (!budgetData || budgetData.length === 0) {
          try {
            const allBudgetData = await creditService.getBudgetMasterData();
            const filteredData = allBudgetData.filter(item => 
              String(item.department) === String(deptId) ||
              (item.department_name && dept && 
               item.department_name.toLowerCase() === dept.name.toLowerCase())
            );
            console.log('Filtered budget data:', filteredData);
            setBudgetMasterData(filteredData);
          } catch (err) {
            console.error('Error fetching all budget data:', err);
          }
        }
      } catch (err) {
        console.error('Error loading department data:', err);
        setError('Failed to load budget data for this department');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAccountAmountChange = (index, values) => {
    const { floatValue } = values;
    
    const updatedEntries = [...accountEntries];
    updatedEntries[index].amount = floatValue || '';
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
      const newEntries = [...accountEntries, newEntry];
      setAccountEntries(newEntries);
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
    
    const validEntries = accountEntries.filter(
      entry => entry.key_account_id && 
              entry.amount && 
              parseFloat(entry.amount) > 0
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
      
      // Step 1: Create the request with regular Credit Request
      const payload = {
        department_id: parseInt(formData.department_id),
        entries: validEntries.map(entry => ({
          key_account_id: entry.key_account_id,
          amount: parseFloat(entry.amount),
          reason: entry.reason || 'Request created by admin',
        })),
        version: formData.version || 1,
        status: 'pending'
      };
      
      console.log('Submitting payload:', payload);
      const response = await creditService.createCreditRequest(payload);
      console.log('Submission response:', response);
      
      // Remove Step 2 to keep status as 'pending'
      // The revision request code was here
      
      setSuccess('Credit request created successfully and is now pending!');
      setIsSubmitted(true);
      
      setTimeout(() => {
        navigate('/admin/credit');
      }, 3000);
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'Failed to submit credit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startNewRequest = () => {
    setFormData({
      department_id: '',
      version: 1,
    });
    setSelectedDepartment(null);
    setDepartmentName('');
    setAccountEntries([]);
    setIsSubmitted(false);
    setSuccess(null);
    setError(null);
  };

  const accountsByType = accountEntries.reduce((groups, account) => {
    const type = account.type || 'Uncategorized';
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {});

  return (
    <div className="flex-1 p-8 ml-64">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Credit Request for Department</h1>
        {isSubmitted && (
          <button
            type="button"
            onClick={startNewRequest}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create Another Request
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
                value={formData.department_id}
                onChange={handleDepartmentChange}
                disabled={isSubmitted}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
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
                                      <NumericFormat
                                        id={`amount-${entryIndex}`}
                                        value={entry.amount}
                                        onValueChange={(values) => handleAccountAmountChange(entryIndex, values)}
                                        thousandSeparator=","
                                        decimalScale={2}
                                        fixedDecimalScale
                                        prefix="฿"
                                        placeholder="0.00"
                                        disabled={isSubmitted}
                                        required
                                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                                      placeholder="Please provide a detailed reason for this account request"
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
                            {availableKeyAccounts && availableKeyAccounts.length > 0 ? (
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
                                {!availableKeyAccounts || availableKeyAccounts.length === 0
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
                <p className="text-gray-500">Please select a department to start creating a credit request.</p>
              </div>
            )}
          </div>

          {!isSubmitted && (
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => navigate('/admin/credit')}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || accountEntries.length === 0 || !formData.department_id}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isSubmitting ? <LoadingSpinner /> : 'Submit Request for Review'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminCreditRequestCreation;