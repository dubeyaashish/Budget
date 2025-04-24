// frontend/src/components/user/RevisionRequests.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import withdrawalService from '../../services/withdrawalService';
import categoryService from '../../services/categoryService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const RevisionRequests = () => {
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    category_id: '',
    key_account_id: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [requests, allCategories] = await Promise.all([
          withdrawalService.getUserRevisionRequests(),
          categoryService.getAllCategories()
        ]);
        
        setRevisionRequests(requests);
        setCategories(allCategories);
      } catch (err) {
        console.error('Error fetching revision requests:', err);
        setError('Failed to load revision requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRevise = (request) => {
    setSelectedRequest(request);
    
    // Initialize form with current request data
    setFormData({
      amount: request.suggestedAmount || request.amount,
      reason: request.reason,
      category_id: request.category_id,
      key_account_id: request.key_account_id
    });
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setFormData({
      amount: '',
      reason: '',
      category_id: '',
      key_account_id: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedRequest) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await withdrawalService.submitRevision(selectedRequest.id, formData);
      
      setSuccess('Revision submitted successfully!');
      
      // Remove the request from the list
      setRevisionRequests(revisionRequests.filter(req => req.id !== selectedRequest.id));
      
      // Close the modal
      closeModal();
    } catch (err) {
      console.error('Error submitting revision:', err);
      setError(err.response?.data?.message || 'Failed to submit revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Revision Requests</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      {success && <AlertMessage type="success" message={success} />}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Requests Needing Revision</h2>
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
                      Request Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Suggested Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin Feedback
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revisionRequests.map(request => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.department_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(request.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.suggestedAmount ? formatCurrency(request.suggestedAmount) : 'Not specified'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {request.feedback}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleRevise(request)}
                          className="text-indigo-600 hover:text-indigo-900"
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
            <p className="text-gray-500">No revision requests found.</p>
          )}
        </div>
      </div>
      
      {/* Revision Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg max-w-lg mx-auto p-8 shadow-xl w-full">
            <h2 className="text-xl font-bold mb-4">Revise Withdrawal Request</h2>
            
            <div className="mb-4 bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <h3 className="text-sm font-medium text-yellow-800">Admin Feedback</h3>
              <p className="mt-1 text-sm text-yellow-700">{selectedRequest.feedback}</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">฿</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                  />
                </div>
                {selectedRequest.suggestedAmount && (
                  <p className="mt-1 text-sm text-gray-500">
                    Suggested amount: {formatCurrency(selectedRequest.suggestedAmount)}
                  </p>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="key_account_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Key Account ID
                </label>
                <input
                  type="text"
                  name="key_account_id"
                  id="key_account_id"
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={formData.key_account_id}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Please provide a detailed reason for this withdrawal request"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                  onClick={closeModal}
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