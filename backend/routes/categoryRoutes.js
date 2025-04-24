// backend/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Get all categories
router.get('/', authenticateToken, categoryController.getAllCategories);

// Get category by ID
router.get('/:id', authenticateToken, categoryController.getCategoryById);

// Create new category (admin only)
router.post('/', authenticateToken, isAdmin, categoryController.createCategory);

// Update category (admin only)
router.put('/:id', authenticateToken, isAdmin, categoryController.updateCategory);

// Delete category (admin only)
router.delete('/:id', authenticateToken, isAdmin, categoryController.deleteCategory);

module.exports = router;
