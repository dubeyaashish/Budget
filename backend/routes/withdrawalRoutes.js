// backend/routes/withdrawalRoutes.js
const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Create withdrawal request
router.post('/', authenticateToken, withdrawalController.createWithdrawalRequest);

// Get user withdrawal requests
router.get('/user', authenticateToken, withdrawalController.getUserWithdrawalRequests);

// Get all pending withdrawal requests (admin only)
router.get('/pending', authenticateToken, isAdmin, withdrawalController.getAllPendingRequests);

// Get department pending withdrawal requests
router.get('/pending/department/:departmentId', authenticateToken, withdrawalController.getDepartmentPendingRequests);

// Approve withdrawal request (admin only)
router.put('/:id/approve', authenticateToken, isAdmin, withdrawalController.approveWithdrawalRequest);

// Reject withdrawal request (admin only)
router.put('/:id/reject', authenticateToken, isAdmin, withdrawalController.rejectWithdrawalRequest);

// Check available budget
router.get('/check-budget/:departmentId/:categoryId', authenticateToken, withdrawalController.checkAvailableBudget);

module.exports = router;