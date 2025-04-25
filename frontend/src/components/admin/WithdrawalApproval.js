// frontend/src/components/admin/WithdrawalApproval.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import withdrawalService from '../../services/withdrawalService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const WithdrawalApproval = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accountsWithUsage } = useContext(KeyAccountContext);
  
  const [request, setRequest] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [suggestedAmount, setSuggestedAmount] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get all pending requests
        const requests = await withdrawalService.getAllPendingRequests();
        setPendingRequests(requests);
        
        // If an ID is provided, fetch that specific request
        if (id) {
          const requestData = await withdrawalService.getWithdrawalRequestById(id);
          if (requestData) {
            setRequest(requestData);
            setSuggestedAmount(requestData.amount);
          } else {
            setError('Withdrawal request not found');
          }
        } else if (requests.length > 0) {
          // If no ID provided but requests exist, select the first one
          setRequest(requests[0]);
          setSuggestedAmount(requests[0].amount);
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

  const selectRequest = async (selectedRequest) => {
    setRequest(selectedRequest);
    setSuggestedAmount(selectedRequest.amount);
    
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

  const openRevisionModal = () => {
    setRevisionFeedback('');
    setSuggestedAmount(request ? request.amount : '');
    setShowRevisionModal(true);
  };

  const closeRevisionModal = () => {
    setShowRevisionModal(false);
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

  const handleRequestRevision = async () => {
    if (!request) return;
    
    if (!revisionFeedback.trim()) {
      setError('Please provide feedback for the revision');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // If suggested amount is different from original, include it
      const suggAmt = suggestedAmount && parseFloat(suggestedAmount) !== parseFloat(request.amount) 
        ? parseFloat(suggestedAmount) 
        : null;
      
      await withdrawalService.requestRevision(
        request.id, 
        revisionFeedback,
        suggAmt
      );
      
      setSuccess('Revision requested successfully');
      closeRevisionModal();
      
      // Remove from pending list
      setPendingRequests(pendingRequests.filter(req => req.id !== request.id));
      setRequest(null);
      
      // Redirect back to list after 2 seconds
      setTimeout(() => {
        navigate('/admin/withdrawals');
      }, 2000);
    } catch (err) {
      console.error('Error requesting revision:', err);
      setError(err.response?.data?.message || 'Failed to request revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find account usage data if available
  const getAccountUsageData = (accountId) => {
    if (!accountId) return null;
    return accountsWithUsage.find(acc => acc.id === accountId);
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
                          {req.department_name} - {req.category_name || 'No category'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Account: {req.account_name || req.key_account_id}
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
                    <p className="mt-1 text-lg font-medium text-gray-900">{request.category_name || 'Not specified'}</p>
                  </div>
                </div>
                
                {/* Account Details Section */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Account Information</h3>
                    
                    {request.key_account_id && (
                      <div className="text-xs text-gray-500">
                        Account ID: <span className="font-medium">{request.key_account_id}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">
                          Account Name
                        </label>
                        <div className="mt-1 text-sm font-medium text-gray-900">
                          {request.account_name || 'Not specified'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500">
                          Account Type
                        </label>
                        <div className="mt-1 text-sm text-gray-900">
                          {request.account_type || 'Not specified'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">
                          Requested Amount
                        </label>
                        <div className="mt-1 text-lg font-bold text-indigo-600">
                          {formatCurrency(request.amount)}
                        </div>
                      </div>
                      
                      {/* Show account usage data if available */}
                      {request.key_account_id && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Account Budget Status
                          </label>
                          
                          {(() => {
                            const accountData = getAccountUsageData(request.key_account_id);
                            if (!accountData) return <div className="mt-1 text-sm text-gray-500">No budget data available</div>;
                            
                            const usagePercent = accountData.total_budget > 0 
                              ? (accountData.used_amount / accountData.total_budget) * 100 
                              : 0;
                            
                            return (
                              <div className="mt-1">
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>Used: {formatCurrency(accountData.used_amount || 0)}</span>
                                  <span>Total: {formatCurrency(accountData.total_budget || 0)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      usagePercent > 80 ? 'bg-red-500' : 
                                      usagePercent > 60 ? 'bg-yellow-500' : 
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                  />
                                </div>
                                <div className="text-xs text-right mt-1 text-gray-500">
                                  {accountData.available_amount > 0 
                                    ? `${formatCurrency(accountData.available_amount)} available` 
                                    : 'Budget depleted'}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500">Reason</h3>
                  <p className="mt-2 text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-200">
                    {request.reason}
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={openRejectModal}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Reject
                  </button>
                  
                  <button
                    onClick={openRevisionModal}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Request Revision
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
      
      {/* Revision Request Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg max-w-lg mx-auto p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Request Revision</h2>
            
            <div className="mb-4">
              <label htmlFor="suggestedAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Suggested Amount (Optional)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">฿</span>
                </div>
                <input
                  type="number"
                  id="suggestedAmount"
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={suggestedAmount}
                  onChange={(e) => setSuggestedAmount(e.target.value)}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Current request: {request ? formatCurrency(request.amount) : ''}
              </p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="revisionFeedback" className="block text-sm font-medium text-gray-700 mb-1">
                Feedback for Revision
              </label>
              <textarea
                id="revisionFeedback"
                rows={4}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Please provide feedback for the requested changes"
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                required
              />
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                onClick={closeRevisionModal}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                onClick={handleRequestRevision}
              >
                {isSubmitting ? <LoadingSpinner /> : 'Request Revision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalApproval;