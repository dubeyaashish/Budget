// backend/models/withdrawalModel.js
const db = require('../config/db');
const keyAccountModel = require('./keyAccountModel');

/**
 * Create withdrawal request
 * @param {Object} requestData - Withdrawal request data
 * @returns {Promise} Promise with insert result
 */
exports.createWithdrawalRequest = (requestData) => {
  const { user_id, department_id, category_id, key_account_id, amount, reason } = requestData;
  
  const query = `
    INSERT INTO budget_withdrawal_requests
    (user_id, department_id, category_id, key_account_id, amount, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `;
  
  return db.query(query, [user_id, department_id, category_id, key_account_id, amount, reason]);
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
           ka.name as account_name,
           ka.account_type,
           CONCAT(u.name, ' ', u.surname) as requester_name,
           CONCAT(a.name, ' ', a.surname) as approver_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_categories c ON wr.category_id = c.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
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
exports.getAllPendingRequests = () => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           c.name as category_name,
           ka.name as account_name,
           ka.account_type,
           CONCAT(u.name, ' ', u.surname) as requester_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_categories c ON wr.category_id = c.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    WHERE wr.status = 'pending'
    ORDER BY wr.created_at ASC
  `;
  
  return db.query(query);
};

/**
 * Get requests needing revision
 * @param {Number} userId - User ID (optional, for specific user revisions)
 * @returns {Promise} Promise with revision requests
 */
exports.getRevisionRequests = (userId = null) => {
  let query = `
    SELECT wr.*,
           d.name as department_name,
           c.name as category_name,
           ka.name as account_name,
           ka.account_type,
           CONCAT(u.name, ' ', u.surname) as requester_name,
           CONCAT(a.name, ' ', a.surname) as reviewer_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_categories c ON wr.category_id = c.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    LEFT JOIN budget_users a ON wr.approved_by = a.id
    WHERE wr.status = 'revision'
  `;
  
  if (userId) {
    query += ' AND wr.user_id = ?';
    return db.query(query, [userId]);
  }
  
  query += ' ORDER BY wr.updated_at DESC';
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
           ka.name as account_name,
           ka.account_type,
           CONCAT(u.name, ' ', u.surname) as requester_name
    FROM budget_withdrawal_requests wr
    JOIN budget_categories c ON wr.category_id = c.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    WHERE wr.department_id = ? AND wr.status = 'pending'
    ORDER BY wr.created_at ASC
  `;
  
  return db.query(query, [departmentId]);
};

/**
 * Get withdrawal request by ID
 * @param {Number} requestId - Request ID
 * @returns {Promise} Promise with request details
 */
exports.getWithdrawalRequestById = async (requestId) => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           c.name as category_name,
           ka.name as account_name,
           ka.account_type,
           ka.total_budget,
           ka.used_amount,
           CONCAT(u.name, ' ', u.surname) as requester_name,
           CONCAT(a.name, ' ', a.surname) as approver_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_categories c ON wr.category_id = c.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    LEFT JOIN budget_users a ON wr.approved_by = a.id
    WHERE wr.id = ?
  `;
  
  const result = await db.query(query, [requestId]);
  return result[0];
};

/**
 * Approve withdrawal request
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin ID approving the request
 * @returns {Promise} Promise with update result
 */
exports.approveWithdrawalRequest = async (requestId, adminId) => {
  // Start a transaction to ensure data consistency
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get the request details
    const [requestDetails] = await connection.query(
      'SELECT key_account_id, amount FROM budget_withdrawal_requests WHERE id = ?',
      [requestId]
    );
    
    if (!requestDetails || requestDetails.length === 0) {
      throw new Error('Request not found');
    }
    
    // Update the request status
    await connection.query(
      `UPDATE budget_withdrawal_requests
       SET status = 'approved', approved_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status IN ('pending', 'revision')`,
      [adminId, requestId]
    );
    
    // Update the used amount in the key account
    await connection.query(
      `UPDATE budget_key_accounts
       SET used_amount = used_amount + ?
       WHERE id = ?`,
      [requestDetails[0].amount, requestDetails[0].key_account_id]
    );
    
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    connection.release();
  }
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
        feedback = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status IN ('pending', 'revision')
  `;
  
  return db.query(query, [adminId, reason, requestId]);
};

/**
 * Request revision of withdrawal request
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin ID requesting revision
 * @param {String} feedback - Revision feedback
 * @param {Number} suggestedAmount - Optional suggested amount
 * @returns {Promise} Promise with update result
 */
exports.requestRevision = async (requestId, adminId, feedback, suggestedAmount = null) => {
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get current request details for history
    const [currentRequest] = await connection.query(
      'SELECT amount FROM budget_withdrawal_requests WHERE id = ?', 
      [requestId]
    );
    
    if (!currentRequest || currentRequest.length === 0) {
      throw new Error('Request not found');
    }
    
    // Update status and add feedback
    const updateQuery = suggestedAmount !== null
      ? `UPDATE budget_withdrawal_requests 
         SET status = 'revision', approved_by = ?, feedback = ?, amount = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`
      : `UPDATE budget_withdrawal_requests 
         SET status = 'revision', approved_by = ?, feedback = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`;
    
    const params = suggestedAmount !== null
      ? [adminId, feedback, suggestedAmount, requestId]
      : [adminId, feedback, requestId];
    
    await connection.query(updateQuery, params);
    
    // Record revision history
    if (suggestedAmount !== null) {
      await connection.query(
        `INSERT INTO budget_request_revisions
         (request_id, previous_amount, new_amount, feedback, revised_by)
         VALUES (?, ?, ?, ?, ?)`,
        [requestId, currentRequest[0].amount, suggestedAmount, feedback, adminId]
      );
    }
    
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Submit revised request
 * @param {Number} requestId - Request ID
 * @param {Number} userId - User ID submitting revision
 * @param {Object} updateData - Updated request data
 * @returns {Promise} Promise with update result
 */
exports.submitRevision = async (requestId, userId, updateData) => {
  // Ensure the user owns the request
  const [ownership] = await db.query(
    'SELECT id FROM budget_withdrawal_requests WHERE id = ? AND user_id = ? AND status = ?',
    [requestId, userId, 'revision']
  );
  
  if (!ownership || ownership.length === 0) {
    throw new Error('Request not found or not in revision status');
  }
  
  const { amount, reason, category_id, key_account_id } = updateData;
  
  const query = `
    UPDATE budget_withdrawal_requests
    SET amount = ?,
        reason = ?,
        category_id = ?,
        key_account_id = ?,
        status = 'pending',
        feedback = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  return db.query(query, [amount, reason, category_id, key_account_id, requestId]);
};

/**
 * Check available budget for a specific key account
 * @param {String} keyAccountId - Key Account ID
 * @returns {Promise} Promise with available budget
 */
exports.checkAvailableBudget = async (keyAccountId) => {
  const [account] = await db.query(
    `SELECT total_budget, used_amount, 
            (total_budget - used_amount) as available_amount
     FROM budget_key_accounts 
     WHERE id = ?`,
    [keyAccountId]
  );
  
  if (!account || account.length === 0) {
    return { total_budget: 0, used_amount: 0, available_amount: 0 };
  }
  
  return account[0];
};

/**
 * Get revision history for a request
 * @param {Number} requestId - Request ID
 * @returns {Promise} Promise with revision history
 */
exports.getRevisionHistory = async (requestId) => {
  const query = `
    SELECT r.*,
           CONCAT(u.name, ' ', u.surname) as revised_by_name
    FROM budget_request_revisions r
    JOIN budget_users u ON r.revised_by = u.id
    WHERE r.request_id = ?
    ORDER BY r.created_at DESC
  `;
  
  return db.query(query, [requestId]);
};

/**
 * Get department spending summary
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with spending summary
 */
exports.getDepartmentSpendingSummary = async (departmentId) => {
  const query = `
    SELECT
      ka.account_type,
      SUM(wr.amount) as total_spent
    FROM budget_withdrawal_requests wr
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    WHERE wr.department_id = ? AND wr.status = 'approved'
    GROUP BY ka.account_type
    ORDER BY total_spent DESC
  `;
  
  return db.query(query, [departmentId]);
};