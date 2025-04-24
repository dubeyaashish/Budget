const budgetModel = require('../models/budgetModel');

/**
 * Get all budget limits
 * GET /api/budgets
 */
exports.getAllBudgetLimits = async (req, res) => {
  try {
    const limits = await budgetModel.getAllBudgetLimits();
    res.json(limits);
  } catch (error) {
    console.error('Error getting budget limits:', error);
    res.status(500).json({ message: 'Server error fetching budget limits.' });
  }
};

/**
 * Get budget limits by department
 * GET /api/budgets/department/:departmentId
 */
exports.getBudgetLimitsByDepartment = async (req, res) => {
  try {
    const departmentId = req.params.departmentId;
    const limits = await budgetModel.getBudgetLimitsByDepartment(departmentId);
    res.json(limits);
  } catch (error) {
    console.error('Error getting department budget limits:', error);
    res.status(500).json({ message: 'Server error fetching department budget limits.' });
  }
};

/**
 * Get budget limit
 * GET /api/budgets/department/:departmentId/category/:categoryId
 */
exports.getBudgetLimit = async (req, res) => {
  try {
    const { departmentId, categoryId } = req.params;
    const limit = await budgetModel.getBudgetLimit(departmentId, categoryId);
    
    if (!limit || limit.length === 0) {
      return res.status(404).json({ message: 'Budget limit not found.' });
    }
    
    res.json(limit[0]);
  } catch (error) {
    console.error('Error getting budget limit:', error);
    res.status(500).json({ message: 'Server error fetching budget limit.' });
  }
};

/**
 * Create budget limit
 * POST /api/budgets
 */
exports.createBudgetLimit = async (req, res) => {
  try {
    const { department_id, category_id, total_amount, per_user_amount } = req.body;
    
    if (!department_id || !category_id || total_amount === undefined) {
      return res.status(400).json({ 
        message: 'Department, category, and total amount are required.' 
      });
    }
    
    const result = await budgetModel.createBudgetLimit({
      department_id,
      category_id,
      total_amount,
      per_user_amount
    });
    
    res.status(201).json({
      message: 'Budget limit created successfully',
      limitId: result.insertId
    });
  } catch (error) {
    console.error('Error creating budget limit:', error);
    res.status(500).json({ message: 'Server error creating budget limit.' });
  }
};

/**
 * Update budget limit
 * PUT /api/budgets/:id
 */
exports.updateBudgetLimit = async (req, res) => {
  try {
    const id = req.params.id;
    const { department_id, category_id, total_amount, per_user_amount, reason } = req.body;
    const adminId = req.user.id;
    
    if (!department_id || !category_id || total_amount === undefined || !reason) {
      return res.status(400).json({ 
        message: 'Department, category, total amount, and reason for change are required.' 
      });
    }
    
    const newLimitId = await budgetModel.updateBudgetLimit(
      id, 
      { department_id, category_id, total_amount, per_user_amount },
      adminId,
      reason
    );
    
    res.json({
      message: 'Budget limit updated successfully',
      newLimitId
    });
  } catch (error) {
    console.error('Error updating budget limit:', error);
    res.status(500).json({ message: 'Server error updating budget limit.' });
  }
};

/**
 * Get budget limit history
 * GET /api/budgets/history/department/:departmentId/category/:categoryId
 */
exports.getBudgetLimitHistory = async (req, res) => {
  try {
    const { departmentId, categoryId } = req.params;
    const history = await budgetModel.getBudgetLimitHistory(departmentId, categoryId);
    res.json(history);
  } catch (error) {
    console.error('Error getting budget limit history:', error);
    res.status(500).json({ message: 'Server error fetching budget limit history.' });
  }
};

/**
 * Get user budget limits
 * GET /api/budgets/user/:userId
 */
exports.getUserBudgetLimits = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // If user is requesting their own budget or is admin
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. You can only view your own budget limits.' 
      });
    }
    
    const limits = await budgetModel.getUserBudgetLimits(userId);
    res.json(limits);
  } catch (error) {
    console.error('Error getting user budget limits:', error);
    res.status(500).json({ message: 'Server error fetching user budget limits.' });
  }
};

/**
 * Set user budget limit
 * POST /api/budgets/user
 */
exports.setUserBudgetLimit = async (req, res) => {
  try {
    const { user_id, department_id, category_id, amount } = req.body;
    
    if (!user_id || !department_id || !category_id || amount === undefined) {
      return res.status(400).json({ 
        message: 'User, department, category, and amount are required.' 
      });
    }
    
    // Only admin can set user-specific budgets
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin rights required to set user budgets.' 
      });
    }
    
    await budgetModel.setUserBudgetLimit({
      user_id,
      department_id,
      category_id,
      amount
    });
    
    res.status(201).json({
      message: 'User budget limit set successfully'
    });
  } catch (error) {
    console.error('Error setting user budget limit:', error);
    res.status(500).json({ message: 'Server error setting user budget limit.' });
  }
};