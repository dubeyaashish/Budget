import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import departmentService from '../../services/departmentService';
import creditService from '../../services/creditService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';
import departmentAccountsData from '../../data/departmentAccounts.json';

const NewCreditRequest = () => {
  const { currentUser } = useContext(AuthContext);
  const { accountsWithUsage, keyAccounts } = useContext(KeyAccountContext);

  // Initialize departments as an empty array to prevent undefined errors
  const [formData, setFormData] = useState({
    department_id: '',
    version: 1,
    status: 'draft',
    request_id: null,
  });
  const [accountEntries, setAccountEntries] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const navigate = useNavigate();

  // Log state and context for debugging
  console.log('NewCreditRequest render:', {
    currentUser: JSON.stringify(currentUser, null, 2),
    formData: JSON.stringify(formData, null, 2),
    accountEntries: JSON.stringify(accountEntries, null, 2),
    departments: JSON.stringify(departments, null, 2),
    availableAccounts: JSON.stringify(availableAccounts, null, 2),
  });

  // Calculate total amount
  const totalAmount = accountEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);

  useEffect(() => {
    const fetchData = async () => {
      // Guard against invalid currentUser
      if (!currentUser || !currentUser.id) {
        console.warn('No valid currentUser, skipping fetch');
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const departmentsData = await departmentService.getAllDepartments();
        console.log('Departments data:', JSON.stringify(departmentsData, null, 2));
        // Ensure departmentsData is an array
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);

        if (currentUser.department) {
          setFormData((prev) => ({
            ...prev,
            department_id: currentUser.department,
          }));
        }

        const latestRequest = await creditService.getLatestUserCreditRequest();
        console.log('Latest request from backend:', JSON.stringify(latestRequest, null, 2));

        if (latestRequest && latestRequest.id && latestRequest.department_id) {
          setFormData({
            department_id: latestRequest.department_id,
            version: latestRequest.version || 1,
            status: latestRequest.status || 'draft',
            request_id: latestRequest.id,
          });
          const entries = Array.isArray(latestRequest.entries) ? latestRequest.entries : [];
          setAccountEntries(
            entries.map((entry) => ({
              key_account_id: entry.key_account_id || '',
              key_account_name: entry.key_account_name || '',
              amount: entry.amount ? entry.amount.toString() : '',
              remark: entry.reason || '',
              available: getAvailableAmount(entry.key_account_id) || 0,
            }))
          );
          setIsSubmitted(latestRequest.status !== 'draft');
        } else {
          console.log('No valid latest request found:', latestRequest);
          setFormData({
            department_id: currentUser?.department || '',
            version: 1,
            status: 'draft',
            request_id: null,
          });
          setAccountEntries([]);
          setIsSubmitted(false);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load departments or request data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  useEffect(() => {
    if (formData.department_id) {
      populateDepartmentAccounts(formData.department_id);
    } else {
      setAccountEntries([]);
      setAvailableAccounts([]);
    }
  }, [formData.department_id, departments, keyAccounts, accountsWithUsage]);

  const populateDepartmentAccounts = (departmentId) => {
    try {
      const department = departments.find((d) => d.id?.toString() === departmentId?.toString());
      if (!department) {
        console.warn(`Department not found for ID: ${departmentId}`);
        setAccountEntries([]);
        return;
      }

      const deptData = departmentAccountsData.find(
        (d) =>
          d.Department.toLowerCase() === department.name?.toLowerCase() ||
          (department.name && department.name.toLowerCase().includes(d.Department.toLowerCase()))
      );

      if (deptData && deptData.Accounts && !isSubmitted) {
        const entries = deptData.Accounts.map((acc) => {
          const accountId = acc['Key Account ID'];
          return {
            key_account_id: accountId || '',
            key_account_name: acc['Key Account'] || '',
            amount: '',
            remark: '',
            available: getAvailableAmount(accountId) || 0,
          };
        });
        setAccountEntries(entries);
      } else {
        setAccountEntries([]);
      }

      setAvailableAccounts(
        keyAccounts.map((account) => ({
          id: account.id || '',
          name: account.name || 'Unknown',
          available: getAvailableAmount(account.id) || 0,
        }))
      );
    } catch (err) {
      console.error('Error loading department accounts:', err);
      setAccountEntries([]);
      setAvailableAccounts([]);
    }
  };

  const getAvailableAmount = (accountId) => {
    if (!accountId) {
      console.warn('getAvailableAmount: No accountId provided');
      return 0;
    }
    const account = accountsWithUsage.find((a) => a.id === accountId);
    if (account && account.available_amount !== undefined) {
      return account.available_amount;
    }
    const basicAccount = keyAccounts.find((a) => a.id === accountId);
    if (basicAccount) {
      return basicAccount.total_budget - (basicAccount.used_amount || 0);
    }
    console.warn(`getAvailableAmount: No account found for ID ${accountId}`);
    return 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAccountAmountChange = (index, value) => {
    const updatedEntries = [...accountEntries];
    if (!updatedEntries[index]) {
      console.error(`No entry at index ${index}`);
      return;
    }
    updatedEntries[index].amount = value;
    setAccountEntries(updatedEntries);
  };

  const handleAccountRemarkChange = (index, value) => {
    const updatedEntries = [...accountEntries];
    if (!updatedEntries[index]) {
      console.error(`No entry at index ${index}`);
      return;
    }
    updatedEntries[index].remark = value;
    setAccountEntries(updatedEntries);
  };

  const removeAccountEntry = (index) => {
    const updatedEntries = [...accountEntries];
    updatedEntries.splice(index, 1);
    setAccountEntries(updatedEntries);
  };

  const addAccountEntry = () => {
    if (availableAccounts.length === 0) {
      console.warn('addAccountEntry: No available accounts');
      return;
    }
    setAccountEntries([
      ...accountEntries,
      {
        key_account_id: '',
        key_account_name: '',
        amount: '',
        remark: '',
        available: 0,
      },
    ]);
  };

  const handleAccountChange = (index, accountId) => {
    const account = availableAccounts.find((a) => a.id === accountId);
    if (!account) {
      console.warn(`handleAccountChange: No account found for ID ${accountId}`);
      return;
    }
    const updatedEntries = [...accountEntries];
    if (!updatedEntries[index]) {
      console.error(`No entry at index ${index}`);
      return;
    }
    updatedEntries[index] = {
      ...updatedEntries[index],
      key_account_id: account.id,
      key_account_name: account.name,
      available: account.available,
    };
    setAccountEntries(updatedEntries);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.department_id) {
      setError('Please select a department');
      return;
    }

    const validEntries = accountEntries.filter(
      (entry) => entry.key_account_id && entry.amount && parseFloat(entry.amount) > 0 && entry.remark.trim()
    );

    if (validEntries.length === 0) {
      setError('Please add at least one account with a valid amount and remark');
      return;
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
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let successCount = 0;
      const submissionPromises = [];

      for (const entry of validEntries) {
        const payload = {
          department_id: parseInt(formData.department_id),
          key_account_id: entry.key_account_id,
          amount: parseFloat(entry.amount),
          reason: entry.remark,
          version: formData.version,
          status: 'pending',
          parent_request_id: null,
        };

        console.log('Preparing credit request:', payload);

        submissionPromises.push(
          creditService
            .createCreditRequest(payload)
            .then((response) => {
              console.log('💡 createCreditRequest returned:', response);
              successCount++;
              if (successCount === 1) {
                setFormData((prev) => ({
                  ...prev,
                  request_id: response.id,
                  status: 'pending',
                }));
              }
              return true;
            })
            .catch((err) => {
              console.error('Error with individual request:', err);
              return {
                error: err.response?.data?.message || 'Request failed',
              };
            })
        );
      }

      const results = await Promise.all(submissionPromises);

      const errors = results.filter((result) => result.error).map((result) => result.error);

      if (successCount > 0) {
        setSuccess(`${successCount} credit request(s) submitted successfully!`);
        setIsSubmitted(true);
      } else if (errors.length > 0) {
        setError(`Failed to submit requests: ${errors[0]}`);
      } else {
        setError('No requests were submitted. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting credit requests:', err);
      setError(err.response?.data?.message || 'Failed to submit credit requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveAsDraft = async () => {
    try {
      const payload = {
        department_id: parseInt(formData.department_id) || 0,
        entries: accountEntries
          .filter((entry) => entry.key_account_id)
          .map((entry) => ({
            key_account_id: entry.key_account_id,
            amount: parseFloat(entry.amount) || 0,
            reason: entry.remark,
          })),
        version: formData.version,
        status: 'draft',
      };

      await creditService.saveDraftCreditRequest(payload);
      setSuccess('Request saved as draft');
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Failed to save draft');
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

  // Prevent rendering until currentUser is valid
  if (!currentUser || !currentUser.id) {
    console.log('Render guard: Waiting for currentUser');
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
                onChange={handleChange}
                disabled={isSubmitted}
                required
              >
                <option value="">Select Department</option>
                {Array.isArray(departments) &&
                  departments.map((dept, index) => (
                    <option key={dept?.id || `dept-${index}`} value={dept?.id || ''}>
                      {dept?.name || 'Unknown'}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-end">
              <p className="text-sm font-medium text-gray-700">
                Total Amount: <span className="font-bold">{formatCurrency(totalAmount)}</span>
              </p>
            </div>
          </div>

          <div className="mt-8 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Account Entries</h2>
              {!isSubmitted && (
                <button
                  type="button"
                  onClick={addAccountEntry}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg
                    className="h-4 w-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add Account
                </button>
              )}
            </div>

            {accountEntries.length > 0 ? (
              <div className="space-y-4 mb-6">
                {accountEntries.map((entry, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-start space-x-4">
                      <div className="flex-grow">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label
                              htmlFor={`account-${index}`}
                              className="block text-sm font-medium text-gray-700"
                            >
                              Key Account <span className="text-red-500">*</span>
                            </label>
                            {entry.key_account_id && entry.key_account_name ? (
                              <div className="mt-1 text-sm text-gray-900 py-2 px-3 bg-gray-100 border border-gray-300 rounded-md">
                                {entry.key_account_id} - {entry.key_account_name}
                              </div>
                            ) : (
                              <select
                                id={`account-${index}`}
                                value={entry.key_account_id || ''}
                                onChange={(e) => handleAccountChange(index, e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                disabled={isSubmitted}
                                required
                              >
                                <option value="">Select Account</option>
                                {availableAccounts.map((account) => (
                                  <option key={account.id || `acc-${index}`} value={account.id || ''}>
                                    {account.id} - {account.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor={`amount-${index}`}
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
                                id={`amount-${index}`}
                                value={entry.amount || ''}
                                onChange={(e) => handleAccountAmountChange(index, e.target.value)}
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

                        <div>
                          <label
                            htmlFor={`remark-${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            Remark <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id={`remark-${index}`}
                            rows={3}
                            value={entry.remark || ''}
                            onChange={(e) => handleAccountRemarkChange(index, e.target.value)}
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Please provide a detailed reason for this account request"
                            disabled={isSubmitted}
                            required
                          />
                        </div>
                      </div>

                      {!isSubmitted && (
                        <button
                          type="button"
                          onClick={() => removeAccountEntry(index)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : formData.department_id ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">
                  No accounts added yet. Select a department and accounts will be pre-populated, or click "Add Account" to
                  add one manually.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">Please select a department to see available accounts.</p>
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
                    Date: {new Date(Date.now() - 86400000).toLocaleDateString('en-GB')}
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