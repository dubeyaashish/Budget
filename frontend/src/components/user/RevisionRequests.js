// frontend/src/components/user/RevisionRequests.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import creditService from '../../services/creditService';
import keyAccountService from '../../services/keyAccountService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const RevisionRequests = () => {
  const { currentUser } = useContext(AuthContext);
  const { keyAccounts } = useContext(KeyAccountContext);
  
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [availableKeyAccounts, setAvailableKeyAccounts] = useState([]);
  const [versionHistory, setVersionHistory] = useState([]);
  
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    key_account_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get revision requests for the current user
      const requests = await creditService.getUserCreditRevisionRequests();
      console.log('Fetched revision requests:', requests);
      setRevisionRequests(requests);
      
      // Get available key accounts for selection
      const accounts = await keyAccountService.getAllKeyAccounts();
      setAvailableKeyAccounts(accounts);
    } catch (err) {
      console.error('Error fetching revision requests:', err);
      setError('Failed to load revision requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevise = async (request) => {
    try {
      setIsLoading(true);
      
      // Fetch version history to see previous versions
      const versions = await creditService.getCreditRequestVersions(request.id);
      setVersionHistory(versions);
      
      setSelectedRequest(request);
      setFormData({
        amount: request.amount || '',
        reason: request.reason || '',
        key_account_id: request.key_account_id || ''
      });
      
      setShowModal(true);
    } catch (err) {
      console.error('Error preparing revision:', err);
      setError('Failed to prepare revision form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (!formData.reason) {
      setError('Please provide a reason for this request');
      return;
    }
    
    if (!formData.key_account_id) {
      setError('Please select a key account');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Submit updated revision back to the admin
      await creditService.updateRevisionVersion(selectedRequest.id, {
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        key_account_id: formData.key_account_id
      });
      
      setSuccess('Revision updated successfully and sent back for review');
      setShowModal(false);
      
      // Refresh the data
      fetchData();
    } catch (err) {
      console.error('Error submitting revision:', err);
      setError(err.response?.data?.message || 'Failed to update revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setFormData({
      amount: '',
      reason: '',
      key_account_id: ''
    });
    setVersionHistory([]);
    setError(null);
  };

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Revision Requests</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      {success && <AlertMessage type="success" message={success} />}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Pending Revisions</h2>
          <p className="text-sm text-gray-500 mt-1">
            These are requests that require your attention following admin review
          </p>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          ) : revisionRequests.length > 0 ? (
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
                      Current Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Suggested Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin Feedback
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revisionRequests.map(request => (
                    <tr key={request.id} className="hover:bg-gray-50">
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
                        {request.suggested_amount ? (
                          <span className={`text-sm ${
                            parseFloat(request.suggested_amount) < parseFloat(request.amount) 
                              ? 'text-red-600' 
                              : parseFloat(request.suggested_amount) > parseFloat(request.amount)
                              ? 'text-green-600'
                              : 'text-gray-500'
                          }`}>
                            {formatCurrency(request.suggested_amount)}
                            {parseFloat(request.suggested_amount) !== parseFloat(request.amount) && (
                              <span className="ml-1">
                                ({parseFloat(request.suggested_amount) > parseFloat(request.amount) ? '+' : ''}
                                {(((parseFloat(request.suggested_amount) - parseFloat(request.amount)) / parseFloat(request.amount)) * 100).toFixed(1)}%)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Not specified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.version || 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="max-w-xs truncate">
                          {request.feedback || 'No feedback provided'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={() => handleRevise(request)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Revise
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 py-4">No revision requests found. All your submissions are up to date!</p>
          )}
        </div>
      </div>
      
      {/* Revision Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg max-w-3xl mx-auto p-8 shadow-xl w-full max-h-screen overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4">Revise Credit Request</h2>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Admin Feedback</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>{selectedRequest.feedback || 'No specific feedback provided by admin.'}</p>
                    {selectedRequest.suggested_amount && (
                      <p className="mt-1">
                        <strong>Suggested amount:</strong> {formatCurrency(selectedRequest.suggested_amount)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="key_account_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Key Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="key_account_id"
                    name="key_account_id"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={formData.key_account_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Key Account</option>
                    {availableKeyAccounts.map(account => (
                      <option 
                        key={account.id} 
                        value={account.id}
                        selected={account.id === selectedRequest.key_account_id}
                      >
                        {account.name} ({account.account_type || 'Unknown'})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">฿</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  {selectedRequest.suggested_amount && (
                    <p className="mt-1 text-xs text-gray-500">
                      Admin suggested: {formatCurrency(selectedRequest.suggested_amount)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Provide a reason for this request"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {versionHistory.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Version History</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {versionHistory.map((version, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm border border-gray-200">
                        <div className="flex justify-between">
                          <span className="font-medium">V{version.version || '?'}</span>
                          <span className="text-gray-500">{new Date(version.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span>Amount: {formatCurrency(version.amount)}</span>
                          <span>Status: {version.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isSubmitting ? <LoadingSpinner /> : 'Submit Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionRequests;