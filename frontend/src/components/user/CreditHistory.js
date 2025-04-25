// frontend/src/components/user/CreditHistory.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import creditService from '../../services/creditService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const CreditHistory = () => {
  const [creditRequests, setCreditRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [requestVersions, setRequestVersions] = useState([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  useEffect(() => {
    const fetchCreditRequests = async () => {
      try {
        setIsLoading(true);
        const requests = await creditService.getUserCreditRequests();
        setCreditRequests(requests);
      } catch (err) {
        console.error('Error fetching credit requests:', err);
        setError('Failed to load your credit requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreditRequests();
  }, []);

  const viewRequestDetails = async (requestId) => {
    try {
      setIsLoadingVersions(true);
      setShowModal(true);
      
      // Find the selected request
      const request = creditRequests.find(req => req.id === requestId);
      setSelectedRequest(request);
      
      // Get version history if available
      if (request.version > 1 || request.status === 'revision') {
        const versions = await creditService.getCreditRequestVersions(requestId);
        setRequestVersions(versions);
      } else {
        setRequestVersions([]);
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
      setError('Failed to load request details');
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setRequestVersions([]);
  };

  // Filter requests based on status
  const filteredRequests = creditRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  return (
    <div className="flex-1 p-8 ml-64">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Credit History</h1>
        <Link
          to="/new-credit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          New Credit Request
        </Link>
      </div>
      
      {error && <AlertMessage type="error" message={error} />}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Your Credit Requests</h2>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-md ${
                  filter === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 text-sm rounded-md ${
                  filter === 'pending' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-3 py-1 text-sm rounded-md ${
                  filter === 'approved' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-3 py-1 text-sm rounded-md ${
                  filter === 'rejected' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setFilter('revision')}
                className={`px-3 py-1 text-sm rounded-md ${
                  filter === 'revision' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Needs Revision
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner size="large" />
            </div>
          ) : filteredRequests.length > 0 ? (
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
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map(request => (
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
                        {request.version || 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : request.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : request.status === 'revision'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => viewRequestDetails(request.id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No credit requests found.</p>
          )}
        </div>
      </div>
      
      {/* Detail Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg max-w-4xl mx-auto p-8 shadow-xl w-full max-h-screen overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4">Credit Request Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Request ID</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">{selectedRequest.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date Submitted</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {new Date(selectedRequest.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Department</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">{selectedRequest.department_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedRequest.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedRequest.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : selectedRequest.status === 'revision'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Request Version</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {selectedRequest.version || 1}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Amount</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {formatCurrency(selectedRequest.amount)}
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500">Reason</h3>
              <p className="mt-2 text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-200">
                {selectedRequest.reason}
              </p>
            </div>
            
            {selectedRequest.feedback && (
              <div className="mb-6 bg-yellow-50 p-4 rounded-md border border-yellow-200">
                <h3 className="text-sm font-medium text-yellow-800">Admin Feedback</h3>
                <p className="mt-1 text-sm text-yellow-700">{selectedRequest.feedback}</p>
              </div>
            )}
            
            {/* Version History Section */}
            {isLoadingVersions ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : requestVersions.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Version History</h3>
                <div className="space-y-3">
                  {requestVersions.map((version, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">Version {version.version}</span>
                          {selectedRequest.version === version.version && (
                            <span className="ml-2 text-xs text-blue-500 font-medium">Current</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">Date: {new Date(version.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Amount: </span>
                          <span className="font-medium">{formatCurrency(version.amount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status: </span>
                          <span className="font-medium">{version.status}</span>
                        </div>
                      </div>
                      {version.feedback && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Feedback: </span>
                          <span className="italic">{version.feedback}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            
            <div className="flex justify-end mt-6">
              {selectedRequest.status === 'revision' && (
                <Link
                  to={`/revise-credit/${selectedRequest.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Revise Request
                </Link>
              )}
              <button
                className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditHistory;