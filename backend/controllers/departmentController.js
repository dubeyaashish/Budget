const departmentModel = require('../models/departmentModel');

/**
 * Get all departments
 * GET /api/departments
 */
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await departmentModel.getAllDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Error getting departments:', error);
    res.status(500).json({ message: 'Server error fetching departments.' });
  }
};

/**
 * Get department by ID
 * GET /api/departments/:id
 */
exports.getDepartmentById = async (req, res) => {
  try {
    const id = req.params.id;
    const department = await departmentModel.getDepartmentById(id);
    
    if (!department || department.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }
    
    res.json(department[0]);
  } catch (error) {
    console.error('Error getting department:', error);
    res.status(500).json({ message: 'Server error fetching department.' });
  }
};

/**
 * Create new department
 * POST /api/departments
 */
exports.createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Department name is required.' });
    }
    
    const result = await departmentModel.createDepartment({ name, description });
    res.status(201).json({ 
      message: 'Department created successfully',
      departmentId: result.insertId
    });
  } catch (error) {
    console.error('Error creating department:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Department with this name already exists.' });
    }
    res.status(500).json({ message: 'Server error creating department.' });
  }
};

/**
 * Update department
 * PUT /api/departments/:id
 */
exports.updateDepartment = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Department name is required.' });
    }
    
    const department = await departmentModel.getDepartmentById(id);
    if (!department || department.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }
    
    await departmentModel.updateDepartment(id, { name, description });
    res.json({ message: 'Department updated successfully.' });
  } catch (error) {
    console.error('Error updating department:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Department with this name already exists.' });
    }
    res.status(500).json({ message: 'Server error updating department.' });
  }
};

/**
 * Delete department
 * DELETE /api/departments/:id
 */
exports.deleteDepartment = async (req, res) => {
  try {
    const id = req.params.id;
    
    const department = await departmentModel.getDepartmentById(id);
    if (!department || department.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }
    
    await departmentModel.deleteDepartment(id);
    res.json({ message: 'Department deleted successfully.' });
  } catch (error) {
    console.error('Error deleting department:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ 
        message: 'Cannot delete department. It is referenced by budget limits or users.' 
      });
    }
    res.status(500).json({ message: 'Server error deleting department.' });
  }
};