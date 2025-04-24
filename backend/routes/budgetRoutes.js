// backend/routes/budgetRoutes.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Get all budget limits (admin only)
router.get('/', authenticateToken, isAdmin, budgetController.getAllBudgetLimits);

// Get budget limits by department
router.get('/department/:departmentId', authenticateToken, budgetController.getBudgetLimitsByDepartment);

// Get specific budget limit
router.get('/department/:departmentId/category/:categoryId', authenticateToken, budgetController.getBudgetLimit);

// Create budget limit (admin only)
router.post('/', authenticateToken, isAdmin, budgetController.createBudgetLimit);

// Update budget limit (admin only)
router.put('/:id', authenticateToken, isAdmin, budgetController.updateBudgetLimit);

// Get budget limit history
router.get('/history/department/:departmentId/category/:categoryId', authenticateToken, budgetController.getBudgetLimitHistory);

// Get user budget limits
router.get('/user/:userId', authenticateToken, budgetController.getUserBudgetLimits);

// Set user budget limit (admin only)
router.post('/user', authenticateToken, isAdmin, budgetController.setUserBudgetLimit);

module.exports = router;