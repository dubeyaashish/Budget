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

// Get user revision requests
router.get('/revisions', authenticateToken, withdrawalController.getUserRevisionRequests);

// Get all pending withdrawal requests (admin only)
router.get('/pending', authenticateToken, isAdmin, withdrawalController.getAllPendingRequests);

// Get department pending withdrawal requests
router.get('/pending/department/:departmentId', authenticateToken, withdrawalController.getDepartmentPendingRequests);

// Get withdrawal request by ID
router.get('/:id', authenticateToken, withdrawalController.getWithdrawalRequestById);

// Approve withdrawal request (admin only)
router.put('/:id/approve', authenticateToken, isAdmin, withdrawalController.approveWithdrawalRequest);

// Reject withdrawal request (admin only)
router.put('/:id/reject', authenticateToken, isAdmin, withdrawalController.rejectWithdrawalRequest);

// Request revision of withdrawal request (admin only)
router.put('/:id/revision', authenticateToken, isAdmin, withdrawalController.requestRevision);

// Submit revised request
router.put('/:id/update', authenticateToken, withdrawalController.submitRevision);

// Check available budget
router.get('/check-budget/:accountId', authenticateToken, withdrawalController.checkAvailableBudget);

// Get department spending summary
router.get('/summary/department/:departmentId', authenticateToken, withdrawalController.getDepartmentSpendingSummary);

module.exports = router;