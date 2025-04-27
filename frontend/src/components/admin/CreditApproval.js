// frontend/src/components/admin/CreditApproval.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import creditService from '../../services/creditService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const CreditApproval = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accountsWithUsage } = useContext(KeyAccountContext);
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [detailedRequest, setDetailedRequest] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [editedAmount, setEditedAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [batchRevisions, setBatchRevisions] = useState([]);

  // Include all request types
  const allRequests = [...pendingRequests, ...revisionRequests];

  // Group requests by department
  const groupedRequests = allRequests.reduce((acc, req) => {
    const dept = req.department_name || 'Uncategorized';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(req);
    return acc;
  }, {});

  // Fetch data on mount and when id changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [pending, revisions] = await Promise.all([
          creditService.getAllPendingRequests(),
          creditService.getAllRevisionRequests()
        ]);
        
        console.log('Pending requests:', pending);
        console.log('Revision requests:', revisions);
        
        setPendingRequests(pending || []);
        setRevisionRequests(revisions || []);
        
        if (id) {
          const requestData = await creditService.getCreditRequestById(id);
          if (requestData) {
            setDetailedRequest(requestData);
            setSelectedDepartment(requestData.department_name || 'Uncategorized');
            setEditedAmount(requestData.amount?.toString() || '');
            // Fetch version history
            try {
              const versions = await creditService.getCreditRequestVersions(requestData.id);
              setVersionHistory(versions || []);
            } catch (err) {
              console.error('Error fetching versions:', err);
              setVersionHistory([]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching credit requests:', err);
        setError('Failed to load credit requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pending, revisions] = await Promise.all([
        creditService.getAllPendingRequests(),
        creditService.getAllRevisionRequests()
      ]);
      setPendingRequests(pending || []);
      setRevisionRequests(revisions || []);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectDepartment = (dept) => {
    setSelectedDepartment(dept);
    setSelectedRequests([]);
    setDetailedRequest(null);
    setEditedAmount('');
    setRemark('');
    setVersionHistory([]);
    navigate('/admin/credit', { replace: true });
  };

  const toggleRequestSelection = (req) => {
    setSelectedRequests(prev => {
      const isSelected = prev.some(r => r.id === req.id);
      if (isSelected) {
        return prev.filter(r => r.id !== req.id);
      } else {
        return [...prev, { ...req, editedAmount: req.amount, remark: '' }];
      }
    });
  };

  const selectRequestForDetails = async (req) => {
    try {
      setIsLoading(true);
      setDetailedRequest(req);
      setEditedAmount(req.amount?.toString() || '');
      setRemark('');
      
      // Fetch version history
      const versions = await creditService.getCreditRequestVersions(req.id);
      setVersionHistory(versions || []);
      
      navigate(`/admin/credit/${req.id}`, { replace: true });
    } catch (err) {
      console.error('Error fetching request details:', err);
      setError('Failed to load request details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!requestId) {
      setError('No request selected');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      await creditService.approveCreditRequest(requestId, { feedback: remark });
      
      setSuccess('Credit request approved successfully');
      
      // Update the UI by removing the approved request
      setPendingRequests(pendingRequests.filter(req => req.id !== requestId));
      setRevisionRequests(revisionRequests.filter(req => req.id !== requestId));
      setSelectedRequests(selectedRequests.filter(req => req.id !== requestId));
      
      if (detailedRequest?.id === requestId) {
        setDetailedRequest(null);
        setEditedAmount('');
        setRemark('');
        setVersionHistory([]);
      }
      
      setTimeout(() => {
        navigate('/admin/credit');
      }, 2000);
    } catch (err) {
      console.error('Error approving credit request:', err);
      setError(err.response?.data?.message || 'Failed to approve credit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (requestId) => {
    if (!remark.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await creditService.rejectCreditRequest(requestId, { reason: remark });
      
      setSuccess('Credit request rejected successfully');
      setPendingRequests(pendingRequests.filter(req => req.id !== requestId));
      setRevisionRequests(revisionRequests.filter(req => req.id !== requestId));
      setSelectedRequests(selectedRequests.filter(req => req.id !== requestId));
      
      if (detailedRequest?.id === requestId) {
        setDetailedRequest(null);
        setEditedAmount('');
        setRemark('');
        setVersionHistory([]);
      }
      
      setTimeout(() => {
        navigate('/admin/credit');
      }, 2000);
    } catch (err) {
      console.error('Error rejecting credit request:', err);
      setError(err.response?.data?.message || 'Failed to reject credit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (selectedRequests.length === 0 && !detailedRequest) {
      setError('Please select at least one request');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Handle single request from third pane
      if (detailedRequest && selectedRequests.length === 0) {
        const amount = parseFloat(editedAmount);
        if (isNaN(amount) || amount <= 0) {
          setError('Please enter a valid amount');
          setIsSubmitting(false);
          return;
        }
        
        if (!remark.trim()) {
          setError('Please provide a remark for the revision');
          setIsSubmitting(false);
          return;
        }
        
        // Create a revision request
        await creditService.createRevisionRequest(
          detailedRequest.id,
          {
            feedback: remark,
            suggested_amount: amount
          }
        );
        
        setSuccess('Revision requested successfully. The user will be notified.');
        
        // Update UI state
        setPendingRequests(pendingRequests.filter(req => req.id !== detailedRequest.id));
        
        const revisedRequest = {
          ...detailedRequest,
          status: 'revision',
          suggested_amount: amount,
          feedback: remark
        };
        
        setRevisionRequests([...revisionRequests, revisedRequest]);
        setDetailedRequest(null);
        setEditedAmount('');
        setRemark('');
        setVersionHistory([]);
      }
      // Handle batch revisions
      else if (batchRevisions.length > 0) {
        const invalidRevision = batchRevisions.find(
          rev => !rev.remark.trim() || isNaN(parseFloat(rev.editedAmount)) || parseFloat(rev.editedAmount) <= 0
        );
        
        if (invalidRevision) {
          setError('Please provide feedback and valid amounts for all selected requests');
          setIsSubmitting(false);
          return;
        }
        
        // Process all revisions in parallel
        await Promise.all(
          batchRevisions.map(rev =>
            creditService.createRevisionRequest(
              rev.id,
              {
                feedback: rev.remark,
                suggested_amount: parseFloat(rev.editedAmount)
              }
            )
          )
        );
        
        setSuccess(`Revision requested for ${batchRevisions.length} requests. Users will be notified.`);
        
        // Update UI state
        const revisedIds = batchRevisions.map(rev => rev.id);
        
        // Remove from pending
        setPendingRequests(pendingRequests.filter(req => !revisedIds.includes(req.id)));
        
        // Add to revisions
        const newRevisions = batchRevisions.map(rev => {
          // Find the original request
          const originalRequest = pendingRequests.find(req => req.id === rev.id);
          return {
            ...originalRequest,
            status: 'revision',
            suggested_amount: parseFloat(rev.editedAmount),
            feedback: rev.remark
          };
        });
        
        setRevisionRequests([...revisionRequests, ...newRevisions]);
        
        // Reset selection state
        setSelectedRequests([]);
        setBatchRevisions([]);
      }
      
      closeRevisionModal();
      
      setTimeout(() => {
        navigate('/admin/credit');
      }, 2000);
    } catch (err) {
      console.error('Error requesting revision:', err);
      setError(err.response?.data?.message || 'Failed to request revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (requestId) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await creditService.resolveRevision(requestId);
      
      setSuccess('Credit request resolved successfully');
      setRevisionRequests(revisionRequests.filter(req => req.id !== requestId));
      setSelectedRequests(selectedRequests.filter(req => req.id !== requestId));
      
      if (detailedRequest?.id === requestId) {
        setDetailedRequest(null);
        setEditedAmount('');
        setRemark('');
        setVersionHistory([]);
      }
      
      // Refresh data to get the newly pending request
      setTimeout(() => {
        refreshData();
      }, 1000);
      
      setTimeout(() => {
        navigate('/admin/credit');
      }, 2000);
    } catch (err) {
      console.error('Error resolving revision:', err);
      setError(err.response?.data?.message || 'Failed to resolve revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRevisionModal = () => {
    setBatchRevisions(
      selectedRequests.map(req => ({
        id: req.id,
        account_name: req.account_name,
        originalAmount: req.amount,
        editedAmount: req.amount || 0,
        remark: ''
      }))
    );
    setShowRevisionModal(true);
  };

  const closeRevisionModal = () => {
    setShowRevisionModal(false);
    setBatchRevisions([]);
  };

  const updateBatchRevision = (id, field, value) => {
    setBatchRevisions(prev =>
      prev.map(rev =>
        rev.id === id ? { ...rev, [field]: value } : rev
      )
    );
  };

  const getAccountUsageData = (accountId) => {
    if (!accountId) return null;
    return accountsWithUsage.find(acc => acc.id === accountId);
  };

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Credit Requests</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      {success && <AlertMessage type="success" message={success} />}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department List Pane */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Departments</h2>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : Object.keys(groupedRequests).length > 0 ? (
              <div className="overflow-y-auto max-h-96">
                <ul className="divide-y divide-gray-200">
                  {Object.entries(groupedRequests).map(([dept, reqs]) => {
                    // Count requests by status
                    const pendingCount = reqs.filter(r => r.status === 'pending').length;
                    const revisionCount = reqs.filter(r => r.status === 'revision').length;
                    
                    return (
                      <li
                        key={dept}
                        className={`py-4 px-4 cursor-pointer hover:bg-gray-50 ${
                          selectedDepartment === dept ? 'bg-indigo-50' : ''
                        }`}
                        onClick={() => selectDepartment(dept)}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{dept}</span>
                          <div className="flex space-x-2">
                            {pendingCount > 0 && (
                              <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full">
                                {pendingCount} pending
                              </span>
                            )}
                            {revisionCount > 0 && (
                              <span className="px-2 py-1 text-xs text-yellow-800 bg-yellow-100 rounded-full">
                                {revisionCount} revision
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="px-4 text-gray-500">No departments found with requests.</p>
            )}
          </div>
        </div>
        
        {/* Requests for Selected Department Pane */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {selectedDepartment ? `Requests: ${selectedDepartment}` : 'Select a Department'}
            </h2>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : selectedDepartment && groupedRequests[selectedDepartment]?.length > 0 ? (
              <div className="overflow-y-auto max-h-96">
                <ul className="divide-y divide-gray-200">
                  {groupedRequests[selectedDepartment].map(req => (
                    <li
                      key={req.id}
                      className={`py-4 px-4 cursor-pointer hover:bg-gray-50 ${
                        detailedRequest?.id === req.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedRequests.some(r => r.id === req.id)}
                          onChange={() => toggleRequestSelection(req)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <div className="flex-1" onClick={() => selectRequestForDetails(req)}>
                          <div className="flex flex-col">
                            <span className="font-semibold text-lg text-gray-900">
                              {req.account_name || 'Not specified'}
                            </span>
                            <span className="text-sm text-gray-500">
                              Requester: {req.requester_name} {req.requester_surname}
                            </span>
                            <span className="text-sm font-medium text-indigo-600 mt-1">
                              {formatCurrency(req.amount)}
                              {req.status === 'revision' && ` (Version ${req.version || 1})`}
                            </span>
                            <div className="flex items-center mt-1">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                req.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                                req.status === 'revision' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {req.status}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                {new Date(req.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {selectedRequests.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={openRevisionModal}
                      disabled={isSubmitting}
                      className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      Request Revision for {selectedRequests.length} Request(s)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="px-4 text-gray-500">No requests found for this department.</p>
            )}
          </div>
        </div>
        
        {/* Request Details Pane */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Request Details</h2>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : detailedRequest ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Account Name</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {detailedRequest.account_name || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Requester</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {detailedRequest.requester_name} {detailedRequest.requester_surname}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Request Date</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {new Date(detailedRequest.created_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Department</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">{detailedRequest.department_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Version</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">{detailedRequest.version || 1}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <p className="mt-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        detailedRequest.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                        detailedRequest.status === 'revision' ? 'bg-yellow-100 text-yellow-800' :
                        detailedRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {detailedRequest.status}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Account Information</h3>
                    {detailedRequest.key_account_id && (
                      <div className="text-xs text-gray-500">
                        Account ID: <span className="font-medium">{detailedRequest.key_account_id}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Account Type</label>
                        <div className="mt-1 text-sm text-gray-900">
                          {detailedRequest.account_type || 'Not specified'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Requested Amount</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">฿</span>
                          </div>
                          <input
                            type="number"
                            value={editedAmount}
                            onChange={(e) => setEditedAmount(e.target.value)}
                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Original: {formatCurrency(detailedRequest.amount)}
                        </p>
                      </div>
                      {detailedRequest.key_account_id && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Account Budget Status</label>
                          {(() => {
                            const accountData = getAccountUsageData(detailedRequest.key_account_id);
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
                    {detailedRequest.reason}
                  </p>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="remark" className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Remark
                  </label>
                  <textarea
                    id="remark"
                    rows={4}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Provide feedback or remarks for the revision or rejection"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </div>
                
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Version History</h3>
                  {versionHistory.length > 0 ? (
                    <div className="space-y-2">
                      {versionHistory.map((version, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">Version {version.version || '1'}</span>
                              <span className="ml-2 text-sm text-gray-500">({version.status})</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(version.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            Amount: {formatCurrency(version.amount)}
                          </p>
                          {version.feedback && (
                            <p className="mt-1 text-sm text-gray-600">
                              Feedback: {version.feedback}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No version history available.</p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3">
                  {detailedRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleRequestRevision()}
                        disabled={isSubmitting}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                      >
                        Request Revision
                      </button>
                      <button
                        onClick={() => handleReject(detailedRequest.id)}
                        disabled={isSubmitting || !remark.trim()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        {isSubmitting ? <LoadingSpinner /> : 'Reject'}
                      </button>
                      <button
                        onClick={() => handleApprove(detailedRequest.id)}
                        disabled={isSubmitting}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        {isSubmitting ? <LoadingSpinner /> : 'Approve'}
                      </button>
                    </>
                  )}
                  
                  {detailedRequest.status === 'revision' && (
                    <button
                      onClick={() => handleResolve(detailedRequest.id)}
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {isSubmitting ? <LoadingSpinner /> : 'Resolve Revision'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select a request to view details.</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Batch Revision Request Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg max-w-4xl mx-auto p-8 shadow-xl w-full">
            <h2 className="text-xl font-bold mb-4">
              Request Revision for {batchRevisions.length} Request(s)
            </h2>
            
            <div className="mb-6 text-sm text-gray-500">
              <p>
                Provide specific feedback for each request to help the user understand what changes are needed.
                If appropriate, you can suggest a revised amount.
              </p>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {batchRevisions.map((rev, index) => (
                <div key={rev.id} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium">
                      {rev.account_name} (Request #{rev.id})
                    </h3>
                    <span className="text-sm text-gray-500">
                      Original: {formatCurrency(rev.originalAmount)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Suggested Amount
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">฿</span>
                        </div>
                        <input
                          type="number"
                          value={rev.editedAmount}
                          onChange={(e) => updateBatchRevision(rev.id, 'editedAmount', e.target.value)}
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      
                      {rev.editedAmount && rev.originalAmount && (
                        <p className="mt-1 text-xs">
                          {parseFloat(rev.editedAmount) > parseFloat(rev.originalAmount) ? (
                            <span className="text-green-600">
                              +{(parseFloat(rev.editedAmount) - parseFloat(rev.originalAmount)).toFixed(2)} 
                              ({(((parseFloat(rev.editedAmount) - parseFloat(rev.originalAmount)) / parseFloat(rev.originalAmount)) * 100).toFixed(1)}%)
                            </span>
                          ) : parseFloat(rev.editedAmount) < parseFloat(rev.originalAmount) ? (
                            <span className="text-red-600">
                              {(parseFloat(rev.editedAmount) - parseFloat(rev.originalAmount)).toFixed(2)} 
                              ({(((parseFloat(rev.editedAmount) - parseFloat(rev.originalAmount)) / parseFloat(rev.originalAmount)) * 100).toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-gray-500">No change</span>
                          )}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Feedback for User
                      </label>
                      <textarea
                        rows={4}
                        value={rev.remark}
                        onChange={(e) => updateBatchRevision(rev.id, 'remark', e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Explain why changes are needed..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                onClick={closeRevisionModal}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none"
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

export default CreditApproval;