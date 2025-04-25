// backend/controllers/withdrawalController.js
const withdrawalModel = require('../models/withdrawalModel');
const keyAccountModel = require('../models/keyAccountModel');

/**
 * Create withdrawal request
 * POST /api/withdrawals
 */
// From your backend/controllers/withdrawalController.js
exports.createWithdrawalRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { department_id, key_account_id, amount, reason } = req.body;
    
    console.log('New withdrawal request:', {
      user: userId,
      account: key_account_id,
      amount: amount
    });

    // Validate required fields
    if (!department_id || !key_account_id || !amount || !reason) {
      return res.status(400).json({ 
        message: 'Department, account, amount, and reason are required.' 
      });
    }
    
    // Check available budget
    try {
      const budget = await withdrawalModel.checkAvailableBudget(key_account_id);
      
      if (budget.available_amount < parseFloat(amount)) {
        return res.status(400).json({ 
          message: `Insufficient budget. Available: ${budget.available_amount}`,
          budget
        });
      }
    } catch (budgetError) {
      console.error('Budget check failed:', {
        account: key_account_id,
        error: budgetError.message
      });
      return res.status(400).json({ 
        message: budgetError.message || 'Error checking available budget',
        details: `Account ID: ${key_account_id}`
      });
    }
    
    // Create the request
    const result = await withdrawalModel.createWithdrawalRequest({
      user_id: userId,
      department_id,
      key_account_id,
      amount: parseFloat(amount),
      reason
    });
    
    return res.status(201).json({
      message: 'Withdrawal request created successfully',
      requestId: result.insertId
    });
    
  } catch (error) {
    console.error('Error creating withdrawal request:', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error creating withdrawal request',
      details: error.message
    });
  }
};

/**
 * Get user withdrawal requests
 * GET /api/withdrawals/user
 */
exports.getUserWithdrawalRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await withdrawalModel.getUserWithdrawalRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error('Error getting user withdrawal requests:', error);
    res.status(500).json({ message: 'Server error fetching withdrawal requests.' });
  }
};

/**
 * Get user requests requiring revision
 * GET /api/withdrawals/revisions
 */
exports.getUserRevisionRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await withdrawalModel.getRevisionRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error('Error getting revision requests:', error);
    res.status(500).json({ message: 'Server error fetching revision requests.' });
  }
};

/**
 * Get all pending withdrawal requests (admin only)
 * GET /api/withdrawals/pending
 */
exports.getAllPendingRequests = async (req, res) => {
  try {
    // Only admin can see all pending requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin rights required.' 
      });
    }
    
    const requests = await withdrawalModel.getAllPendingRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error getting pending withdrawal requests:', error);
    res.status(500).json({ message: 'Server error fetching pending withdrawal requests.' });
  }
};

/**
 * Get department pending withdrawal requests
 * GET /api/withdrawals/pending/department/:departmentId
 */
exports.getDepartmentPendingRequests = async (req, res) => {
  try {
    const departmentId = req.params.departmentId;
    
    // Only admin or users from this department can view
    if (req.user.role !== 'admin' && req.user.department !== parseInt(departmentId)) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view your department\'s requests.' 
      });
    }
    
    const requests = await withdrawalModel.getDepartmentPendingRequests(departmentId);
    res.json(requests);
  } catch (error) {
    console.error('Error getting department pending requests:', error);
    res.status(500).json({ message: 'Server error fetching department pending requests.' });
  }
};

/**
 * Get withdrawal request by ID
 * GET /api/withdrawals/:id
 */
exports.getWithdrawalRequestById = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await withdrawalModel.getWithdrawalRequestById(requestId);
    
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found.' });
    }
    
    // Only admin or request creator can view details
    if (req.user.role !== 'admin' && req.user.id !== request.user_id) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view your own requests.' 
      });
    }
    
    // Get revision history if any
    const revisionHistory = await withdrawalModel.getRevisionHistory(requestId);
    request.revisions = revisionHistory;
    
    res.json(request);
  } catch (error) {
    console.error('Error getting withdrawal request:', error);
    res.status(500).json({ message: 'Server error fetching withdrawal request.' });
  }
};

/**
 * Approve withdrawal request
 * PUT /api/withdrawals/:id/approve
 */
exports.approveWithdrawalRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    
    // Only admin can approve requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin rights required to approve requests.' 
      });
    }
    
    await withdrawalModel.approveWithdrawalRequest(requestId, adminId);
    
    res.json({
      message: 'Withdrawal request approved successfully'
    });
  } catch (error) {
    console.error('Error approving withdrawal request:', error);
    res.status(500).json({ message: 'Server error approving withdrawal request.' });
  }
};

/**
 * Reject withdrawal request
 * PUT /api/withdrawals/:id/reject
 */
exports.rejectWithdrawalRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }
    
    // Only admin can reject requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin rights required to reject requests.' 
      });
    }
    
    await withdrawalModel.rejectWithdrawalRequest(requestId, adminId, reason);
    
    res.json({
      message: 'Withdrawal request rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting withdrawal request:', error);
    res.status(500).json({ message: 'Server error rejecting withdrawal request.' });
  }
};

/**
 * Request revision of withdrawal request
 * PUT /api/withdrawals/:id/revision
 */
exports.requestRevision = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { feedback, suggestedAmount } = req.body;
    
    if (!feedback) {
      return res.status(400).json({ message: 'Feedback is required for revision.' });
    }
    
    // Only admin can request revisions
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin rights required to request revisions.' 
      });
    }
    
    await withdrawalModel.requestRevision(
      requestId, 
      adminId, 
      feedback, 
      suggestedAmount ? parseFloat(suggestedAmount) : null
    );
    
    res.json({
      message: 'Revision requested successfully'
    });
  } catch (error) {
    console.error('Error requesting revision:', error);
    res.status(500).json({ message: 'Server error requesting revision.' });
  }
};

/**
 * Submit revised request
 * PUT /api/withdrawals/:id/update
 */
exports.submitRevision = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.id;
    const { amount, reason, category_id, key_account_id } = req.body;
    
    // Modified validation to make category_id optional
    if (!amount || !reason || !key_account_id) {
      return res.status(400).json({ 
        message: 'Amount, reason, and account are required.' 
      });
    }

    // Check available budget
    const budget = await withdrawalModel.checkAvailableBudget(key_account_id);
    
    if (budget.available_amount < parseFloat(amount)) {
      return res.status(400).json({ 
        message: `Insufficient budget. Available: ${budget.available_amount}`,
        budget
      });
    }
    
    await withdrawalModel.submitRevision(requestId, userId, {
      amount: parseFloat(amount),
      reason,
      category_id: finalCategoryId,
      key_account_id
    });
    
    res.json({
      message: 'Revision submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting revision:', error);
    res.status(500).json({ 
      message: error.message || 'Server error submitting revision.'
    });
  }
};

/**
 * Check available budget
 * GET /api/withdrawals/check-budget/:accountId
 */
exports.checkAvailableBudget = async (req, res) => {
  try {
    const accountId = req.params.accountId;
    
    const budget = await withdrawalModel.checkAvailableBudget(accountId);
    
    res.json(budget);
  } catch (error) {
    console.error('Error checking available budget:', error);
    res.status(500).json({ message: 'Server error checking available budget.' });
  }
};

/**
 * Get department spending summary
 * GET /api/withdrawals/summary/department/:departmentId
 */
exports.getDepartmentSpendingSummary = async (req, res) => {
  try {
    const departmentId = req.params.departmentId;
    
    // Only admin or users from this department can view
    if (req.user.role !== 'admin' && req.user.department !== parseInt(departmentId)) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view your department\'s spending.' 
      });
    }
    
    const summary = await withdrawalModel.getDepartmentSpendingSummary(departmentId);
    res.json(summary);
  } catch (error) {
    console.error('Error getting department spending summary:', error);
    res.status(500).json({ message: 'Server error fetching department spending summary.' });
  }
};