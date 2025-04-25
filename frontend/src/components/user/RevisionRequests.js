import React, { useState, useEffect } from 'react';
import creditService from '../../services/creditService';
import AlertMessage from '../common/AlertMessage';


const RevisionRequests = () => {
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    key_account_id: ''
  });
  const [keyAccounts, setKeyAccounts] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [requests, accounts] = await Promise.all([
        creditService.getUserCreditRevisionRequests(),
        creditService.getKeyAccounts() // Assumes a method to fetch key accounts
      ]);
      setRevisionRequests(requests);
      setKeyAccounts(accounts);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to fetch revision requests');
      setLoading(false);
    }
  };

  const handleRevise = (request) => {
    setSelectedRequest(request);
    setFormData({
      amount: request.amount || '',
      reason: request.reason || '',
      key_account_id: request.key_account_id || ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.amount || formData.amount <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      if (!formData.reason) {
        setError('Please provide a reason');
        return;
      }
      if (!formData.key_account_id) {
        setError('Please select a key account');
        return;
      }

      await creditService.updateRevisionVersion(selectedRequest.id, {
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        key_account_id: formData.key_account_id
      });

      setShowModal(false);
      setFormData({ amount: '', reason: '', key_account_id: '' });
      setSelectedRequest(null);
      setError(null);
      fetchData(); // Refresh the list
    } catch (err) {
      setError(err.message || 'Failed to update revision');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setFormData({ amount: '', reason: '', key_account_id: '' });
    setError(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Revision Credit Requests</h1>

      {error && (
        <AlertMessage
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}

      {revisionRequests.length === 0 ? (
        <p className="text-gray-600">No revision requests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">ID</th>
                <th className="py-3 px-6 text-left">Department</th>
                <th className="py-3 px-6 text-left">Account</th>
                <th className="py-3 px-6 text-right">Amount</th>
                <th className="py-3 px-6 text-left">Reason</th>
                <th className="py-3 px-6 text-left">Version</th>
                <th className="py-3 px-6 text-left">Parent Request ID</th>
                <th className="py-3 px-6 text-left">Feedback</th>
                <th className="py-3 px-6 text-left">Status</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {revisionRequests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-3 px-6">{request.id}</td>
                  <td className="py-3 px-6">{request.department_name}</td>
                  <td className="py-3 px-6">{request.account_name}</td>
                  <td className="py-3 px-6 text-right">
                    {formatCurrency(request.amount)}
                  </td>
                  <td className="py-3 px-6">{request.reason}</td>
                  <td className="py-3 px-6">{request.version}</td>
                  <td className="py-3 px-6">{request.parent_request_id || 'N/A'}</td>
                  <td className="py-3 px-6">{request.feedback || 'N/A'}</td>
                  <td className="py-3 px-6 capitalize">{request.status}</td>
                  <td className="py-3 px-6 text-center">
                    <button
                      onClick={() => handleRevise(request)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition duration-200"
                    >
                      Revise
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Revise Credit Request ID {selectedRequest.parent_request_id}, Version {selectedRequest.version}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="key_account_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Key Account
                </label>
                <select
                  id="key_account_id"
                  name="key_account_id"
                  value={formData.key_account_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select a key account</option>
                  {keyAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.account_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Amount
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-gray-700"
                >
                  Reason
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Provide a detailed reason for this revision"
                  required
                />
              </div>

              {error && (
                <AlertMessage
                  message={error}
                  type="error"
                  onClose={() => setError(null)}
                />
              )}

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition duration-200"
                >
                  Submit Revision
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