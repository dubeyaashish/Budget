// backend/controllers/withdrawalController.js
const withdrawalModel = require('../models/withdrawalModel');

/**
 * Create withdrawal request
 * POST /api/withdrawals
 */
exports.createWithdrawalRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { department_id, category_id, amount, reason } = req.body;
    
    if (!department_id || !category_id || !amount || !reason) {
      return res.status(400).json({ 
        message: 'Department, category, amount, and reason are required.' 
      });
    }
    
    // Check available budget first
    const budget = await withdrawalModel.checkAvailableBudget(userId, department_id, category_id);
    
    if (budget.available_amount < amount) {
      return res.status(400).json({ 
        message: `Insufficient budget. Available: ${budget.available_amount}`,
        budget
      });
    }
    
    const result = await withdrawalModel.createWithdrawalRequest({
      user_id: userId,
      department_id,
      category_id,
      amount,
      reason
    });
    
    res.status(201).json({
      message: 'Withdrawal request created successfully',
      requestId: result.insertId
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({ message: 'Server error creating withdrawal request.' });
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
    
    const requests = await withdrawalModel.getPendingWithdrawalRequests();
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
    
    // TODO: Check if user belongs to department or is admin
    
    const requests = await withdrawalModel.getDepartmentPendingRequests(departmentId);
    res.json(requests);
  } catch (error) {
    console.error('Error getting department pending requests:', error);
    res.status(500).json({ message: 'Server error fetching department pending requests.' });
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
 * Check available budget
 * GET /api/withdrawals/check-budget/:departmentId/:categoryId
 */
exports.checkAvailableBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { departmentId, categoryId } = req.params;
    
    const budget = await withdrawalModel.checkAvailableBudget(userId, departmentId, categoryId);
    
    res.json(budget);
  } catch (error) {
    console.error('Error checking available budget:', error);
    res.status(500).json({ message: 'Server error checking available budget.' });
  }
};