// frontend/src/components/user/NewWithdrawalRequest.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import departmentService from '../../services/departmentService';
import withdrawalService from '../../services/withdrawalService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';
// Import the department accounts data directly
import departmentAccountsData from '../../data/departmentAccounts.json';

const NewWithdrawalRequest = () => {
  const { currentUser } = useContext(AuthContext);
  const { accountsWithUsage, keyAccounts } = useContext(KeyAccountContext);
  
  const [formData, setFormData] = useState({
    department_id: '',
    reason: ''
  });
  
  // Array of account entries, each with account_id and amount
  const [accountEntries, setAccountEntries] = useState([]);
  
  const [departments, setDepartments] = useState([]);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const departmentsData = await departmentService.getAllDepartments();
        
        setDepartments(departmentsData);
        
        // If user has a default department, select it
        if (currentUser.department) {
          setFormData(prev => ({
            ...prev,
            department_id: currentUser.department
          }));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load departments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // When department changes, populate account entries with department-specific accounts
  useEffect(() => {
    if (formData.department_id) {
      populateDepartmentAccounts(formData.department_id);
    } else {
      setAccountEntries([]);
    }
  }, [formData.department_id, departments, keyAccounts]);

  // Load department-specific accounts and set them as entries
  const populateDepartmentAccounts = (departmentId) => {
    try {
      // Get department name
      const department = departments.find(d => d.id === parseInt(departmentId));
      if (!department) return;
      
      // Find department in the imported JSON data
      const deptData = departmentAccountsData.find(d => 
        d.Department === department.name || 
        (department.name && department.name.includes(d.Department))
      );
      
      if (deptData && deptData.Accounts) {
        // Transform to account entries
        const entries = deptData.Accounts.map(acc => ({
          key_account_id: acc["Key Account ID"],
          key_account_name: acc["Key Account"],
          amount: '',
          available: getAvailableAmount(acc["Key Account ID"])
        }));
        
        setAccountEntries(entries);
      } else {
        setAccountEntries([]);
      }
      
      // Set all available accounts for dropdown
      setAvailableAccounts(keyAccounts.map(account => ({
        id: account.id,
        name: account.name,
        available: getAvailableAmount(account.id)
      })));
      
    } catch (err) {
      console.error('Error loading department accounts:', err);
      setAccountEntries([]);
    }
  };
  
  // Helper to get available amount for an account
  const getAvailableAmount = (accountId) => {
    const account = keyAccounts.find(a => a.id === accountId);
    const accountWithUsage = accountsWithUsage.find(a => a.id === accountId);
    
    if (accountWithUsage && accountWithUsage.available_amount !== undefined) {
      return accountWithUsage.available_amount;
    }
    
    if (account) {
      return account.total_budget - (account.used_amount || 0);
    }
    
    return 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle changes to account amount
  const handleAccountAmountChange = (index, value) => {
    const updatedEntries = [...accountEntries];
    updatedEntries[index].amount = value;
    setAccountEntries(updatedEntries);
  };
  
  // Remove an account entry
  const removeAccountEntry = (index) => {
    const updatedEntries = [...accountEntries];
    updatedEntries.splice(index, 1);
    setAccountEntries(updatedEntries);
  };
  
  // Add a new empty account entry
  const addAccountEntry = () => {
    if (availableAccounts.length === 0) return;
    
    setAccountEntries([
      ...accountEntries,
      {
        key_account_id: '',
        key_account_name: '',
        amount: '',
        available: 0
      }
    ]);
  };
  
  // Handle account selection change
  const handleAccountChange = (index, accountId) => {
    const account = availableAccounts.find(a => a.id === accountId);
    if (!account) return;
    
    const updatedEntries = [...accountEntries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      key_account_id: account.id,
      key_account_name: account.name,
      available: account.available
    };
    
    setAccountEntries(updatedEntries);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate the form
    if (!formData.department_id || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Check if we have any valid account entries
    const validEntries = accountEntries.filter(entry => 
      entry.key_account_id && entry.amount && parseFloat(entry.amount) > 0
    );
    
    if (validEntries.length === 0) {
      setError('Please add at least one account with a valid amount');
      return;
    }
    
    // Check if any amount exceeds available budget
    const invalidEntry = accountEntries.find(entry => 
      entry.amount && parseFloat(entry.amount) > entry.available
    );
    
    if (invalidEntry) {
      setError(`Amount for account ${invalidEntry.key_account_name} exceeds available budget of ${formatCurrency(invalidEntry.available)}`);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      let successCount = 0;
      
      // Process one entry at a time sequentially
      for (const entry of validEntries) {
        const payload = {
          department_id: parseInt(formData.department_id),
          category_id: 1, // Adding default category_id as it's required by the backend
          key_account_id: entry.key_account_id,
          amount: parseFloat(entry.amount),
          reason: formData.reason
        };
        
        // Log the payload for debugging
        console.log('Sending withdrawal request:', payload);
        
        try {
          // Send each request individually
          await withdrawalService.createWithdrawalRequest(payload);
          successCount++;
        } catch (err) {
          console.error('Error with individual request:', err);
          // Display the actual error message from the server if available
          if (err.response && err.response.data && err.response.data.message) {
            setError(`Request failed: ${err.response.data.message}`);
          }
          // Continue with other requests even if one fails
        }
      }
      
      if (successCount > 0) {
        setSuccess(`${successCount} withdrawal request(s) submitted successfully!`);
        
        // Reset form
        setFormData({
          department_id: currentUser.department || '',
          reason: ''
        });
        setAccountEntries([]);
        
        // Redirect to withdrawal history after 2 seconds
        setTimeout(() => {
          navigate('/withdrawal-history');
        }, 2000);
      } else {
        setError('All withdrawal requests failed to submit. Please try again.');
      }
      
    } catch (err) {
      console.error('Error submitting withdrawal requests:', err);
      setError(err.response?.data?.message || 'Failed to submit withdrawal requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 ml-64 flex justify-center items-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">New Withdrawal Request</h1>
      
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
                onChange={handleChange}
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
            
            <div className="md:col-span-2">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={4}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Please provide a detailed reason for these withdrawal requests"
                value={formData.reason}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          {/* Account entries section */}
          <div className="mt-8 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Account Entries</h2>
              <button
                type="button"
                onClick={addAccountEntry}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Account
              </button>
            </div>
            
            {accountEntries.length > 0 ? (
              <div className="space-y-4 mb-6">
                {accountEntries.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex-grow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor={`account-${index}`} className="block text-sm font-medium text-gray-700">
                            Key Account <span className="text-red-500">*</span>
                          </label>
                          {entry.key_account_id && entry.key_account_name ? (
                            // Show as text if pre-populated from department
                            <div className="mt-1 text-sm text-gray-900 py-2 px-3 bg-gray-100 border border-gray-300 rounded-md">
                              {entry.key_account_id} - {entry.key_account_name}
                            </div>
                          ) : (
                            // Show as dropdown if added manually
                            <select
                              id={`account-${index}`}
                              value={entry.key_account_id || ''}
                              onChange={(e) => handleAccountChange(index, e.target.value)}
                              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                              required
                            >
                              <option value="">Select Account</option>
                              {availableAccounts.map(account => (
                                <option key={account.id} value={account.id}>
                                  {account.id} - {account.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor={`amount-${index}`} className="block text-sm font-medium text-gray-700">
                            Amount <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">฿</span>
                            </div>
                            <input
                              type="number"
                              id={`amount-${index}`}
                              value={entry.amount}
                              onChange={(e) => handleAccountAmountChange(index, e.target.value)}
                              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              required
                            />
                          </div>
                          {entry.available !== undefined && (
                            <p className="mt-1 text-xs text-gray-500">
                              Available: {formatCurrency(entry.available)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeAccountEntry(index)}
                      className="inline-flex items-center p-1 border border-transparent rounded-full text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : formData.department_id ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">No accounts added yet. Select a department and accounts will be pre-populated, or click "Add Account" to add one manually.</p>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">Please select a department to see available accounts.</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || accountEntries.length === 0}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isSubmitting ? <LoadingSpinner /> : 'Submit Requests'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewWithdrawalRequest;