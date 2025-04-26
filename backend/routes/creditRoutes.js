// backend/routes/creditRoutes.js
const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Get budget master data
router.get('/budget-master', authenticateToken, creditController.getBudgetMasterData);

// Get department budget master data
router.get('/budget-master/department/:departmentId', authenticateToken, creditController.getDepartmentBudgetMasterData);

// Create a new credit request
router.post('/', authenticateToken, creditController.createCreditRequest);

// Get all user credit requests
router.get('/user', authenticateToken, creditController.getUserCreditRequests);

// Get latest user credit request
router.get('/user/latest', authenticateToken, creditController.getLatestUserCreditRequest);

// Get user revision credit requests
router.get('/revisions', authenticateToken, creditController.getUserCreditRevisionRequests);

// Get all revision credit requests (admin only)
router.get('/revisions/all', authenticateToken, isAdmin, creditController.getAllRevisionRequests);

// Get all pending credit requests (admin only)
router.get('/pending', authenticateToken, isAdmin, creditController.getAllPendingRequests);

// Get credit request by ID
router.get('/:id', authenticateToken, creditController.getCreditRequestById);

// Approve credit request (admin only)
router.put('/:id/approve', authenticateToken, isAdmin, creditController.approveCreditRequest);

// Reject credit request (admin only)
router.put('/:id/reject', authenticateToken, isAdmin, creditController.rejectCreditRequest);

// Create revision request (admin only)
router.post('/:id/revision', authenticateToken, isAdmin, creditController.createRevisionRequest);

// Update revision request
router.put('/:id/update', authenticateToken, creditController.updateRevisionRequest);

// Resolve revision (admin only)
router.put('/:id/resolve', authenticateToken, isAdmin, creditController.resolveRevision);

// Check available budget for a key account
router.get('/check-budget/:accountId', authenticateToken, creditController.checkAvailableBudget);

// Get department spending summary
router.get('/summary/department/:departmentId', authenticateToken, creditController.getDepartmentSpendingSummary);

// Save draft credit request
router.post('/draft', authenticateToken, creditController.saveDraftCreditRequest);

// Get user draft credit requests
router.get('/draft', authenticateToken, creditController.getUserDraftCreditRequests);

module.exports = router;