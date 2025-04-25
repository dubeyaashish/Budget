// backend/models/budgetModel.js
const db = require('../config/db');

/**
 * Get all budget limits
 * @returns {Promise} Promise with budget limits data
 */
exports.getAllBudgetLimits = () => {
  const query = `
    SELECT bl.*, d.name as department_name
    FROM budget_limits bl
    JOIN budget_departments d ON bl.department_id = d.id
    WHERE bl.active = TRUE
    ORDER BY d.name
  `;
  return db.query(query);
};

/**
 * Get budget limits by department
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with budget limits data
 */
exports.getBudgetLimitsByDepartment = (departmentId) => {
  const query = `
    SELECT bl.*
    FROM budget_limits bl
    WHERE bl.department_id = ? AND bl.active = TRUE
    ORDER BY c.name
  `;
  return db.query(query, [departmentId]);
};

/**

 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with budget limit data
 */
exports.getAllBudgetLimits = () => {
  const query = `
    SELECT bl.*, d.name as department_name
    FROM budget_limits bl
    JOIN budget_departments d ON bl.department_id = d.id
    WHERE bl.active = TRUE
    ORDER BY d.name
  `;
  return db.query(query);
};

exports.getBudgetLimit = (departmentId) => {
  const query = `
    SELECT *
    FROM budget_limits
    WHERE department_id = ? AND active = TRUE
    LIMIT 1
  `;
  return db.query(query, [departmentId]);
};

// Similar changes for other functions

/**
 * Helper function to deactivate existing budget limit
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with update result
 */
const deactivateExistingLimit = (departmentId) => {
  const query = `
    UPDATE budget_limits
    SET active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE department_id = ? AND active = TRUE
  `;
  return db.query(query, [departmentId]);
};

/**
 * Create budget limit
 * @param {Object} budgetData - Budget limit data
 * @returns {Promise} Promise with insert result
 */
exports.createBudgetLimit = (budgetData) => {
  const { department_id, total_amount, per_user_amount } = budgetData;
  
  // First, deactivate any existing limit
  return deactivateExistingLimit(department_id)
    .then(() => {
      // Then create a new active limit
      const query = `
        INSERT INTO budget_limits 
        (department_id, total_amount, per_user_amount, active) 
        VALUES (?, ?, ?, ?, TRUE)
      `;
      return db.query(query, [department_id, total_amount, per_user_amount]);
    });
};

/**
 * Update budget limit
 * @param {Number} id - Budget limit ID
 * @param {Object} budgetData - Budget limit data to update
 * @param {Number} adminId - Admin user ID making the change
 * @param {String} reason - Reason for the change
 * @returns {Promise} Promise with update result
 */
exports.updateBudgetLimit = async (id, budgetData, adminId, reason) => {
  try {
    // First, get the current limit data for history
    const [currentLimit] = await db.query('SELECT * FROM budget_limits WHERE id = ?', [id]);
    
    if (!currentLimit || currentLimit.length === 0) {
      throw new Error('Budget limit not found');
    }
    
    const { department_id, total_amount, per_user_amount } = budgetData;
    
    // Deactivate the current limit
    await deactivateExistingLimit(department_id);
    
    // Create a new active limit
    const insertResult = await db.query(
      `INSERT INTO budget_limits 
       (department_id, total_amount, per_user_amount, active) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [department_id, total_amount, per_user_amount]
    );
    
    const newLimitId = insertResult.insertId;
    
    // Record the change in history
    await db.query(
      `INSERT INTO budget_limit_history 
       (limit_id, department_id, previous_total_amount, previous_per_user_amount, 
        new_total_amount, new_per_user_amount, changed_by, change_reason) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newLimitId, 
        department_id, 
        currentLimit.total_amount, 
        currentLimit.per_user_amount, 
        total_amount, 
        per_user_amount, 
        adminId, 
        reason
      ]
    );
    
    return newLimitId;
  } catch (error) {
    console.error('Error in updateBudgetLimit:', error);
    throw error;
  }
};

/**
 * Get budget limit history
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with history data
 */
exports.getBudgetLimitHistory = (departmentId) => {
  const query = `
    SELECT h.*, 
           u.name as admin_name, 
           u.surname as admin_surname,
           DATE_FORMAT(h.created_at, '%Y-%m-%d %H:%i:%s') as change_date
    FROM budget_limit_history h
    JOIN budget_users u ON h.changed_by = u.id
    WHERE h.department_id = ? 
    ORDER BY h.created_at DESC
  `;
  return db.query(query, [departmentId]);
};

/**
 * Get user-specific budget limits
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with user budget limits
 */
exports.getUserBudgetLimits = (userId) => {
  const query = `
    SELECT ubl.*, 
           d.name as department_name
    FROM budget_user_limits ubl
    JOIN budget_departments d ON ubl.department_id = d.id
    WHERE ubl.user_id = ? AND ubl.active = TRUE
    ORDER BY d.name, c.name
  `;
  return db.query(query, [userId]);
};

/**
 * Set user-specific budget limit
 * @param {Object} limitData - User limit data
 * @returns {Promise} Promise with insert result
 */
exports.setUserBudgetLimit = async (limitData) => {
  const { user_id, department_id, amount } = limitData;
  
  // First deactivate any existing user-specific limit
  const deactivateQuery = `
    UPDATE budget_user_limits
    SET active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND department_id = ?  AND active = TRUE
  `;
  
  await db.query(deactivateQuery, [user_id, department_id]);
  
  // Then create a new active limit
  const insertQuery = `
    INSERT INTO budget_user_limits
    (user_id, department_id, amount, active)
    VALUES (?, ?, ?, ?, TRUE)
  `;
  
  return db.query(insertQuery, [user_id, department_id, amount]);
};