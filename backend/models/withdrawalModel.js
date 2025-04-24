// backend/models/withdrawalModel.js
const db = require('../config/db');

/**
 * Create withdrawal request
 * @param {Object} requestData - Withdrawal request data
 * @returns {Promise} Promise with insert result
 */
exports.createWithdrawalRequest = (requestData) => {
  const { user_id, department_id, category_id, amount, reason } = requestData;
  
  const query = `
    INSERT INTO budget_withdrawal_requests
    (user_id, department_id, category_id, amount, reason, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `;
  
  return db.query(query, [user_id, department_id, category_id, amount, reason]);
};

/**
 * Get user withdrawal requests
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with withdrawal requests
 */
exports.getUserWithdrawalRequests = (userId) => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           c.name as category_name,
           CONCAT(u.name, ' ', u.surname) as requester_name,
           CONCAT(a.name, ' ', a.surname) as approver_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_categories c ON wr.category_id = c.id
    JOIN budget_users u ON wr.user_id = u.id
    LEFT JOIN budget_users a ON wr.approved_by = a.id
    WHERE wr.user_id = ?
    ORDER BY wr.created_at DESC
  `;
  
  return db.query(query, [userId]);
};

/**
 * Get all pending withdrawal requests
 * @returns {Promise} Promise with pending requests
 */
exports.getPendingWithdrawalRequests = () => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           c.name as category_name,
           CONCAT(u.name, ' ', u.surname) as requester_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_categories c ON wr.category_id = c.id
    JOIN budget_users u ON wr.user_id = u.id
    WHERE wr.status = 'pending'
    ORDER BY wr.created_at ASC
  `;
  
  return db.query(query);
};

/**
 * Get department pending withdrawal requests
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with department pending requests
 */
exports.getDepartmentPendingRequests = (departmentId) => {
  const query = `
    SELECT wr.*,
           c.name as category_name,
           CONCAT(u.name, ' ', u.surname) as requester_name
    FROM budget_withdrawal_requests wr
    JOIN budget_categories c ON wr.category_id = c.id
    JOIN budget_users u ON wr.user_id = u.id
    WHERE wr.department_id = ? AND wr.status = 'pending'
    ORDER BY wr.created_at ASC
  `;
  
  return db.query(query, [departmentId]);
};

/**
 * Approve withdrawal request
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin ID approving the request
 * @returns {Promise} Promise with update result
 */
exports.approveWithdrawalRequest = (requestId, adminId) => {
  const query = `
    UPDATE budget_withdrawal_requests
    SET status = 'approved',
        approved_by = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending'
  `;
  
  return db.query(query, [adminId, requestId]);
};

/**
 * Reject withdrawal request
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin ID rejecting the request
 * @param {String} reason - Rejection reason
 * @returns {Promise} Promise with update result
 */
exports.rejectWithdrawalRequest = (requestId, adminId, reason) => {
  const query = `
    UPDATE budget_withdrawal_requests
    SET status = 'rejected',
        approved_by = ?,
        rejection_reason = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending'
  `;
  
  return db.query(query, [adminId, reason, requestId]);
};

/**
 * Check available budget for a user in a specific department and category
 * @param {Number} userId - User ID
 * @param {Number} departmentId - Department ID
 * @param {Number} categoryId - Category ID
 * @returns {Promise} Promise with available budget
 */
exports.checkAvailableBudget = async (userId, departmentId, categoryId) => {
  try {
    // First check if there's a user-specific limit
    const [userLimits] = await db.query(
      `SELECT amount 
       FROM budget_user_limits 
       WHERE user_id = ? AND department_id = ? AND category_id = ? AND active = TRUE`,
      [userId, departmentId, categoryId]
    );
    
    if (userLimits && userLimits.length > 0) {
      // Calculate used budget
      const [usedBudget] = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as used_amount
         FROM budget_withdrawal_requests
         WHERE user_id = ? AND department_id = ? AND category_id = ? AND status = 'approved'`,
        [userId, departmentId, categoryId]
      );
      
      return {
        total_limit: userLimits[0].amount,
        used_amount: usedBudget[0].used_amount,
        available_amount: userLimits[0].amount - usedBudget[0].used_amount
      };
    }
    
    // If no user-specific limit, check department limit
    const [departmentLimits] = await db.query(
      `SELECT total_amount, per_user_amount
       FROM budget_limits
       WHERE department_id = ? AND category_id = ? AND active = TRUE`,
      [departmentId, categoryId]
    );
    
    if (!departmentLimits || departmentLimits.length === 0) {
      return { total_limit: 0, used_amount: 0, available_amount: 0 };
    }
    
    // If there's a per-user limit defined
    if (departmentLimits[0].per_user_amount) {
      // Calculate used budget for this user
      const [usedBudget] = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as used_amount
         FROM budget_withdrawal_requests
         WHERE user_id = ? AND department_id = ? AND category_id = ? AND status = 'approved'`,
        [userId, departmentId, categoryId]
      );
      
      return {
        total_limit: departmentLimits[0].per_user_amount,
        used_amount: usedBudget[0].used_amount,
        available_amount: departmentLimits[0].per_user_amount - usedBudget[0].used_amount
      };
    } else {
      // Calculate used budget for the entire department
      const [usedBudget] = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as used_amount
         FROM budget_withdrawal_requests
         WHERE department_id = ? AND category_id = ? AND status = 'approved'`,
        [departmentId, categoryId]
      );
      
      return {
        total_limit: departmentLimits[0].total_amount,
        used_amount: usedBudget[0].used_amount,
        available_amount: departmentLimits[0].total_amount - usedBudget[0].used_amount
      };
    }
  } catch (error) {
    console.error('Error in checkAvailableBudget:', error);
    throw error;
  }
};