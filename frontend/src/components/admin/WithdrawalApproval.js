// frontend/src/components/admin/WithdrawalApproval.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import withdrawalService from '../../services/withdrawalService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const WithdrawalApproval = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get all pending requests
        const requests = await withdrawalService.getAllPendingRequests();
        setPendingRequests(requests);
        
        // If an ID is provided, find that specific request
        if (id) {
          const foundRequest = requests.find(req => req.id.toString() === id);
          if (foundRequest) {
            setRequest(foundRequest);
          } else {
            setError('Withdrawal request not found');
          }
        }
      } catch (err) {
        console.error('Error fetching withdrawal requests:', err);
        setError('Failed to load withdrawal requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const selectRequest = (selectedRequest) => {
    setRequest(selectedRequest);
    // Update the URL without reloading
    navigate(`/admin/withdrawals/${selectedRequest.id}`, { replace: true });
  };

  const handleApprove = async () => {
    if (!request) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await withdrawalService.approveWithdrawalRequest(request.id);
      
      setSuccess('Withdrawal request approved successfully');
      
      // Remove from pending list
      setPendingRequests(pendingRequests.filter(req => req.id !== request.id));
      setRequest(null);
      
      // Redirect back to list after 2 seconds
      setTimeout(() => {
        navigate('/admin/withdrawals');
      }, 2000);
    } catch (err) {
      console.error('Error approving withdrawal request:', err);
      setError(err.response?.data?.message || 'Failed to approve withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRejectModal = () => {
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
  };

  const handleReject = async () => {
    if (!request) return;
    
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await withdrawalService.rejectWithdrawalRequest(request.id, rejectionReason);
      
      setSuccess('Withdrawal request rejected successfully');
      closeRejectModal();
      
      // Remove from pending list
      setPendingRequests(pendingRequests.filter(req => req.id !== request.id));
      setRequest(null);
      
      // Redirect back to list after 2 seconds
      setTimeout(() => {
        navigate('/admin/withdrawals');
      }, 2000);
    } catch (err) {
      console.error('Error rejecting withdrawal request:', err);
      setError(err.response?.data?.message || 'Failed to reject withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Withdrawal Requests</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      {success && <AlertMessage type="success" message={success} />}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow col-span-1">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Pending Requests</h2>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : pendingRequests.length > 0 ? (
              <div className="overflow-y-auto max-h-96">
                <ul className="divide-y divide-gray-200">
                  {pendingRequests.map(req => (
                    <li 
                      key={req.id}
                      className={`py-4 cursor-pointer hover:bg-gray-50 ${
                        request && request.id === req.id ? 'bg-indigo-50' : ''
                      }`}
                      onClick={() => selectRequest(req)}
                    >
                      <div className="flex flex-col">
                        <div className="font-medium">{req.requester_name}</div>
                        <div className="text-sm text-gray-500">
                          {req.department_name} - {req.category_name}
                        </div>
                        <div className="text-sm font-semibold text-gray-900 mt-1">
                          {formatCurrency(req.amount)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(req.created_at).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500">No pending withdrawal requests found.</p>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow col-span-1 md:col-span-2">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Request Details</h2>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : request ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Requester</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">{request.requester_name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Request Date</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Department</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">{request.department_name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Category</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">{request.category_name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Amount</h3>
                    <p className="mt-1 text-xl font-bold text-indigo-600">{formatCurrency(request.amount)}</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500">Reason</h3>
                  <p className="mt-2 text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-200">
                    {request.reason}
                  </p>
                </div>
                
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={openRejectModal}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Reject
                  </button>
                  
                  <button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {isSubmitting ? <LoadingSpinner /> : 'Approve'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">
                Select a request from the list to view details.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg max-w-lg mx-auto p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Reject Withdrawal Request</h2>
            
            <div className="mb-4">
              <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Rejection
              </label>
              <textarea
                id="rejectionReason"
                rows={4}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Please provide a reason for rejecting this request"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                onClick={closeRejectModal}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={handleReject}
              >
                {isSubmitting ? <LoadingSpinner /> : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalApproval;