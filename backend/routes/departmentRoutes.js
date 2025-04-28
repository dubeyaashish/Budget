// backend/routes/departmentRoutes.js
const express = require('express');
const router  = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { isAdmin }         = require('../middleware/roleMiddleware');

// Public: list departments
router.get('/',           departmentController.getAllDepartments);
router.get('/:id',        departmentController.getDepartmentById);

// Protected: create/update/delete
router.post('/',           authenticateToken, isAdmin, departmentController.createDepartment);
router.put('/:id',         authenticateToken, isAdmin, departmentController.updateDepartment);
router.delete('/:id',      authenticateToken, isAdmin, departmentController.deleteDepartment);

module.exports = router;
