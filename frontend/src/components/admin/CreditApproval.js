import React, { useState, useEffect, useContext } from 'react';
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

  // Group requests by department
  const groupedRequests = [...pendingRequests, ...revisionRequests].reduce((acc, req) => {
    const dept = req.department_name || 'Uncategorized';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(req);
    return acc;
  }, {});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [pending, revisions] = await Promise.all([
          creditService.getAllPendingRequests(),
          creditService.getAllRevisionRequests()
        ]);
        setPendingRequests(pending);
        setRevisionRequests(revisions);
        
        if (id) {
          const requestData = await creditService.getCreditRequestById(id);
          if (requestData) {
            setDetailedRequest(requestData);
            setSelectedDepartment(requestData.department_name || 'Uncategorized');
            setEditedAmount(requestData.amount.toString());
            // Fetch version history
            const versions = await creditService.getCreditRequestVersions(requestData.id);
            setVersionHistory(versions);
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

  const selectDepartment = (dept) => {
    setSelectedDepartment(dept);
    setSelectedRequests([]);
    setDetailedRequest(null);
    setEditedAmount('');
    setRemark('');
    setVersionHistory([]);
    navigate('/admin/credits', { replace: true });
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
    setDetailedRequest(req);
    setEditedAmount(req.amount.toString());
    setRemark('');
    try {
      const versions = await creditService.getCreditRequestVersions(req.id);
      setVersionHistory(versions);
    } catch (err) {
      console.error('Error fetching version history:', err);
      setError('Failed to load version history');
    }
    navigate(`/admin/credits/${req.id}`, { replace: true });
  };

  const handleApprove = async (requestId) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await creditService.approveCreditRequest(requestId);
      
      setSuccess('Credit request approved successfully');
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
        navigate('/admin/credits');
      }, 2000);
    } catch (err) {
      console.error('Error approving credit request:', err);
      setError(err.response?.data?.message || 'Failed to approve credit request');
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
          return;
        }
        if (!remark.trim()) {
          setError('Please provide a remark for the revision');
          return;
        }
        
        // Create a new revision version
        await creditService.createRevisionVersion(
          detailedRequest.id,
          remark,
          amount
        );
        
        setSuccess('Revision requested successfully');
        setPendingRequests(pendingRequests.filter(req => req.id !== detailedRequest.id));
        setRevisionRequests([...revisionRequests, { ...detailedRequest, status: 'revision', amount }]);
        setDetailedRequest(null);
        setEditedAmount('');
        setRemark('');
        setVersionHistory([]);
      }
      // Handle batch revisions
      else if (batchRevisions.length > 0) {
        const invalidRevision = batchRevisions.find(
          rev => isNaN(parseFloat(rev.editedAmount)) || parseFloat(rev.editedAmount) <= 0 || !rev.remark.trim()
        );
        if (invalidRevision) {
          setError('Please provide valid amounts and remarks for all selected requests');
          return;
        }
        
        await Promise.all(
          batchRevisions.map(rev =>
            creditService.createRevisionVersion(
              rev.id,
              rev.remark,
              parseFloat(rev.editedAmount)
            )
          )
        );
        
        setSuccess('Revision requested successfully for selected requests');
        const revisedIds = batchRevisions.map(rev => rev.id);
        setPendingRequests(pendingRequests.filter(req => !revisedIds.includes(req.id)));
        setRevisionRequests([
          ...revisionRequests,
          ...batchRevisions.map(rev => ({
            ...pendingRequests.find(req => req.id === rev.id),
            status: 'revision',
            amount: parseFloat(rev.editedAmount)
          }))
        ]);
        setSelectedRequests([]);
        setDetailedRequest(null);
        setEditedAmount('');
        setRemark('');
        setVersionHistory([]);
      }
      
      closeRevisionModal();
      setTimeout(() => {
        navigate('/admin/credits');
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
      
      setTimeout(() => {
        navigate('/admin/credits');
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
        editedAmount: req.editedAmount || req.amount,
        remark: req.remark || ''
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
                  {Object.entries(groupedRequests).map(([dept, reqs]) => (
                    <li
                      key={dept}
                      className={`py-4 px-4 cursor-pointer hover:bg-gray-50 ${
                        selectedDepartment === dept ? 'bg-indigo-50' : ''
                      }`}
                      onClick={() => selectDepartment(dept)}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{dept}</span>
                        <span className="text-sm text-gray-500">{reqs.length}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="px-4 text-gray-500">No departments found.</p>
            )}
          </div>
        </div>
        
        {/* Requests for Selected Department Pane */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {selectedDepartment || 'Select a Department'}
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
                              Requester: {req.requester_name}
                            </span>
                            <span className="text-sm font-medium text-indigo-600 mt-1">
                              {formatCurrency(req.amount)}
                              {req.status === 'revision' && ` (Version ${req.version})`}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {new Date(req.created_at).toLocaleString()}
                            </span>
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
                    <p className="mt-1 text-lg font-medium text-gray-900">{detailedRequest.requester_name}</p>
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
                    <p className="mt-1 text-lg font-medium text-gray-900">{detailedRequest.version}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <p className="mt-1 text-lg font-medium text-gray-900">{detailedRequest.status}</p>
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
                    Remark for Revision
                  </label>
                  <textarea
                    id="remark"
                    rows={4}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Provide feedback or remarks for the revision"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </div>
                
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Version History</h3>
                  {versionHistory.length > 0 ? (
                    <div className="space-y-2">
                      {versionHistory.map(version => (
                        <div key={version.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">Version {version.version}</span>
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
                  <button
                    onClick={() => handleRequestRevision()}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Request Revision
                  </button>
                  {detailedRequest.status === 'revision' && (
                    <button
                      onClick={() => handleResolve(detailedRequest.id)}
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {isSubmitting ? <LoadingSpinner /> : 'Resolve'}
                    </button>
                  )}
                  <button
                    onClick={() => handleApprove(detailedRequest.id)}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {isSubmitting ? <LoadingSpinner /> : 'Approve'}
                  </button>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg max-w-2xl mx-auto p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Request Revision for {batchRevisions.length} Request(s)</h2>
            
            <div className="mb-4 overflow-y-auto max-h-96">
              {batchRevisions.map(rev => (
                <div key={rev.id} className="mb-4 p-4 border border-gray-200 rounded-md">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {rev.account_name || 'Not specified'} (ID: {rev.id})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
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
                      <p className="mt-1 text-xs text-gray-500">
                        Original: {formatCurrency(rev.originalAmount)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">
                        Remark
                      </label>
                      <textarea
                        rows={3}
                        value={rev.remark}
                        onChange={(e) => updateBatchRevision(rev.id, 'remark', e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Provide feedback for this request"
                      />
                    </div>
                  </div>
                </div>
              ))}
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

export default CreditApproval;