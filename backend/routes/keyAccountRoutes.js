// backend/routes/keyAccountRoutes.js
const express = require('express');
const router = express.Router();
const keyAccountController = require('../controllers/keyAccountController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Get all key accounts
router.get('/', authenticateToken, keyAccountController.getAllKeyAccounts);

// Get key account by ID
router.get('/:id', authenticateToken, keyAccountController.getKeyAccountById);

// Create or update key account (admin only)
router.post('/', authenticateToken, isAdmin, keyAccountController.upsertKeyAccount);

// Get key accounts with usage data
router.get('/usage/all', authenticateToken, keyAccountController.getKeyAccountsWithUsage);

// Get department-wise spending for a key account
router.get('/:id/departments', authenticateToken, keyAccountController.getDepartmentSpendingByAccount);

// Get account-wise spending for a department
router.get('/departments/:departmentId', authenticateToken, keyAccountController.getAccountSpendingByDepartment);

// Get total budget summary
router.get('/summary/budget', authenticateToken, keyAccountController.getBudgetSummary);

module.exports = router;