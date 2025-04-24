// backend/routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Get all departments
router.get('/', authenticateToken, departmentController.getAllDepartments);

// Get department by ID
router.get('/:id', authenticateToken, departmentController.getDepartmentById);

// Create new department (admin only)
router.post('/', authenticateToken, isAdmin, departmentController.createDepartment);

// Update department (admin only)
router.put('/:id', authenticateToken, isAdmin, departmentController.updateDepartment);

// Delete department (admin only)
router.delete('/:id', authenticateToken, isAdmin, departmentController.deleteDepartment);

module.exports = router;



