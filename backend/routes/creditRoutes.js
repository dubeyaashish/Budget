const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

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

// Get department pending credit requests
router.get('/pending/department/:departmentId', authenticateToken, creditController.getDepartmentPendingRequests);

// Get credit request by ID
router.get('/:id', authenticateToken, creditController.getCreditRequestById);

// Approve credit request (admin only)
router.put('/:id/approve', authenticateToken, isAdmin, creditController.approveCreditRequest);

// Reject credit request (admin only)
router.put('/:id/reject', authenticateToken, isAdmin, creditController.rejectCreditRequest);

// Create revision version of credit request (admin only)
router.post('/:id/revision', authenticateToken, isAdmin, creditController.createRevisionVersion);

// Update revision version
router.put('/:id/update', authenticateToken, creditController.updateRevisionVersion);

// Resolve revision and merge into original request (admin only)
router.put('/:id/resolve', authenticateToken, isAdmin, creditController.resolveCreditRequest);

// Check available budget for a key account
router.get('/check-budget/:accountId', authenticateToken, creditController.checkAvailableBudget);

// Get department spending summary
router.get('/summary/department/:departmentId', authenticateToken, creditController.getDepartmentSpendingSummary);

// Save draft credit request
router.post('/draft', authenticateToken, creditController.saveDraftCreditRequest);

// Get user draft credit requests
router.get('/draft', authenticateToken, creditController.getUserDraftCreditRequests);

module.exports = router;