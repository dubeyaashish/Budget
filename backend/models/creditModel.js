const db = require('../config/db');
const keyAccountModel = require('./keyAccountModel');

/**
 * Create credit request
 * @param {Object} requestData - Credit request data
 * @returns {Promise} Promise with insert result
 */
exports.createCreditRequest = async (requestData) => {
  const {
    user_id,
    department_id,
    key_account_id,
    amount,
    reason,
    version = 1,
    status = 'pending',
    parent_request_id = null
  } = requestData;
  
  const query = `
    INSERT INTO budget_withdrawal_requests
      (user_id, department_id, key_account_id, amount, reason, version, status, parent_request_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  // NOTE: your db.query helper may return [result, fields], adjust as needed
  const result = await db.query(query, [
    user_id,
    department_id,
    key_account_id,
    amount,
    reason,
    version,
    status,
    parent_request_id
  ]);
  
  // Return `id` so the frontend can do response.id
  return { id: result.insertId };
};

/**
 * Get user credit requests
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with credit requests
 */
exports.getUserCreditRequests = async (userId) => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           ka.name as account_name,
           ka.account_type,
           CONCAT(u.name, ' ', u.surname) as requester_name,
           CONCAT(a.name, ' ', a.surname) as approver_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    LEFT JOIN budget_users a ON wr.approved_by = a.id
    WHERE wr.user_id = ?
    ORDER BY wr.created_at DESC
  `;
  
  return db.query(query, [userId]);
};

/**
 * Get latest user credit request
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with the latest credit request
 */
exports.getLatestUserCreditRequest = async (userId) => {
  try {
    console.log(`Executing getLatestUserCreditRequest for userId: ${userId}`);

    const query = `
      SELECT wr.*,
             d.name as department_name,
             ka.name as account_name,
             ka.account_type
      FROM budget_withdrawal_requests wr
      JOIN budget_departments d ON wr.department_id = d.id
      JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
      WHERE wr.user_id = ? AND wr.parent_request_id IS NULL
      ORDER BY wr.created_at DESC
      LIMIT 1
    `;
    
    const [result] = await db.query(query, [userId]);
    console.log('Database query result for latest request:', JSON.stringify(result, null, 2));

    if (!result) {
      console.log(`No credit request found in database for userId: ${userId}`);
      return null;
    }

    // Create an entries array with the single request's data
    const entries = [{
      key_account_id: result.key_account_id,
      key_account_name: result.account_name,
      amount: parseFloat(result.amount), // Convert string to number
      reason: result.reason
    }];

    console.log('Constructed entries array:', JSON.stringify(entries, null, 2));

    // Remove fields that shouldn't be in the main response
    const { key_account_id, amount, reason, account_name, account_type, ...requestData } = result;

    const response = { ...requestData, entries };
    console.log('Final response from getLatestUserCreditRequest:', JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error(`Error in getLatestUserCreditRequest for userId: ${userId}`, error);
    throw error;
  }
};

/**
 * Get all pending credit requests
 * @returns {Promise} Promise with pending requests
 */
exports.getAllPendingRequests = async () => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           ka.name as account_name,
           ka.account_type,
           CONCAT(u.name, ' ', u.surname) as requester_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    WHERE wr.status = 'pending' AND wr.parent_request_id IS NULL
    ORDER BY wr.created_at ASC
  `;
  
  return db.query(query);
};

/**
 * Get all revision credit requests
 * @returns {Promise} Promise with revision requests
 */
exports.getAllRevisionRequests = async () => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           ka.name as account_name,
           ka.account_type,
           CONCAT(u.name, ' ', u.surname) as requester_name,
           CONCAT(a.name, ' ', a.surname) as reviewer_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    LEFT JOIN budget_users a ON wr.approved_by = a.id
    WHERE wr.status = 'revision'
    ORDER BY wr.updated_at DESC
  `;
  
  return db.query(query);
};

/**
 * Get user revision credit requests
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with revision requests
 */
exports.getUserCreditRevisionRequests = async (userId) => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           ka.name as account_name,
           ka.account_type,
           CONCAT(u.name, ' ', u.surname) as requester_name,
           CONCAT(a.name, ' ', a.surname) as reviewer_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    LEFT JOIN budget_users a ON wr.approved_by = a.id
    WHERE wr.status = 'revision' AND wr.user_id = ?
    ORDER BY wr.updated_at DESC
  `;
  
  return db.query(query, [userId]);
};

/**
 * Get department pending credit requests
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with department pending requests
 */
exports.getDepartmentPendingRequests = async (departmentId) => {
  const query = `
    SELECT wr.*,
           ka.name as account_name,
           ka.account_type,
           CONCAT(u.name, ' ', u.surname) as requester_name
    FROM budget_withdrawal_requests wr
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    WHERE wr.department_id = ? AND wr.status = 'pending' AND wr.parent_request_id IS NULL
    ORDER BY wr.created_at ASC
  `;
  
  return db.query(query, [departmentId]);
};

/**
 * Get credit request by ID
 * @param {Number} requestId - Request ID
 * @returns {Promise} Promise with request details
 */
exports.getCreditRequestById = async (requestId) => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           ka.name as account_name,
           ka.account_type,
           ka.total_budget,
           ka.used_amount,
           CONCAT(u.name, ' ', u.surname) as requester_name,
           CONCAT(a.name, ' ', a.surname) as approver_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    LEFT JOIN budget_users a ON wr.approved_by = a.id
    WHERE wr.id = ?
  `;
  
  const result = await db.query(query, [requestId]);
  return result[0];
};

/**
 * Get all versions of a credit request
 * @param {Number} requestId - Request ID
 * @returns {Promise} Promise with all versions
 */
exports.getCreditRequestVersions = async (requestId) => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           ka.name as account_name,
           CONCAT(u.name, ' ', u.surname) as requester_name
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    JOIN budget_users u ON wr.user_id = u.id
    WHERE wr.id = ? OR wr.parent_request_id = ?
    ORDER BY wr.version ASC
  `;
  
  return db.query(query, [requestId, requestId]);
};

/**
 * Approve credit request
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin ID approving the request
 * @returns {Promise} Promise with update result
 */
exports.approveCreditRequest = async (requestId, adminId) => {
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
 * Reject credit request
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin ID rejecting the request
 * @param {String} reason - Rejection reason
 * @returns {Promise} Promise with update result
 */
exports.rejectCreditRequest = async (requestId, adminId, reason) => {
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
 * Create revision version of credit request
 * @param {Number} requestId - Original Request ID
 * @param {Number} adminId - Admin ID requesting revision
 * @param {String} feedback - Revision feedback
 * @param {Number} amount - Suggested amount
 * @returns {Promise} Promise with new revision ID
 */
exports.createRevisionVersion = async (requestId, adminId, feedback, amount) => {
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get original request details
    const [originalRequest] = await connection.query(
      'SELECT * FROM budget_withdrawal_requests WHERE id = ? AND status = ?',
      [requestId, 'pending']
    );
    
    if (!originalRequest[0]) {
      throw new Error('Original request not found or not pending');
    }
    
    // Create new revision version
    const newVersion = originalRequest[0].version + 1;
    const revisionData = {
      user_id: originalRequest[0].user_id,
      department_id: originalRequest[0].department_id,
      key_account_id: originalRequest[0].key_account_id,
      amount: amount,
      reason: originalRequest[0].reason,
      version: newVersion,
      status: 'revision',
      parent_request_id: requestId
    };
    
    const query = `
      INSERT INTO budget_withdrawal_requests
        (user_id, department_id, key_account_id, amount, reason, version, status, parent_request_id, feedback, approved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await connection.query(query, [
      revisionData.user_id,
      revisionData.department_id,
      revisionData.key_account_id,
      revisionData.amount,
      revisionData.reason,
      revisionData.version,
      revisionData.status,
      revisionData.parent_request_id,
      feedback,
      adminId
    ]);
    
    // Log revision history
    await connection.query(
      `INSERT INTO budget_request_revisions
       (request_id, previous_amount, new_amount, feedback, revised_by)
       VALUES (?, ?, ?, ?, ?)`,
      [requestId, originalRequest[0].amount, amount, feedback, adminId]
    );
    
    await connection.commit();
    return { insertId: result.insertId };
  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Update revision version
 * @param {Number} requestId - Revision Request ID
 * @param {Number} userId - User ID submitting update
 * @param {Object} updateData - Updated request data
 * @returns {Promise} Promise with update result
 */
exports.updateRevisionVersion = async (requestId, userId, updateData) => {
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Ensure the user owns the request and it's a revision
    const [ownership] = await connection.query(
      'SELECT id FROM budget_withdrawal_requests WHERE id = ? AND user_id = ? AND status = ?',
      [requestId, userId, 'revision']
    );
    
    if (!ownership[0]) {
      throw new Error('Request not found or not in revision status');
    }
    
    const { amount, reason, key_account_id } = updateData;
    
    const query = `
      UPDATE budget_withdrawal_requests
      SET amount = ?,
          reason = ?,
          key_account_id = ?,
          status = 'revision',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await connection.query(query, [amount, reason, key_account_id, requestId]);
    
    // Log update in revision history
    await connection.query(
      `INSERT INTO budget_request_revisions
       (request_id, previous_amount, new_amount, feedback, revised_by)
       VALUES (?, ?, ?, ?, ?)`,
      [requestId, ownership[0].amount, amount, reason, userId]
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
 * Resolve revision and merge into original request
 * @param {Number} requestId - Revision Request ID
 * @param {Number} adminId - Admin ID resolving the request
 * @returns {Promise} Promise with update result
 */
exports.resolveRevision = async (requestId, adminId) => {
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get revision details
    const [revision] = await connection.query(
      'SELECT * FROM budget_withdrawal_requests WHERE id = ? AND status = ?',
      [requestId, 'revision']
    );
    
    if (!revision[0]) {
      throw new Error('Revision not found');
    }
    
    // Get original request
    const [original] = await connection.query(
      'SELECT * FROM budget_withdrawal_requests WHERE id = ?',
      [revision[0].parent_request_id]
    );
    
    if (!original[0]) {
      throw new Error('Original request not found');
    }
    
    // Update original with revision data
    await connection.query(
      `UPDATE budget_withdrawal_requests
       SET amount = ?,
           reason = ?,
           version = ?,
           status = 'approved',
           approved_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [revision[0].amount, revision[0].reason, revision[0].version, adminId, original[0].id]
    );
    
    // Update key account used amount
    await connection.query(
      `UPDATE budget_key_accounts
       SET used_amount = used_amount + ?
       WHERE id = ?`,
      [revision[0].amount, revision[0].key_account_id]
    );
    
    // Delete revision
    await connection.query(
      'DELETE FROM budget_withdrawal_requests WHERE id = ?',
      [requestId]
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
 * Check available budget for a specific key account
 * @param {String} keyAccountId - Key Account ID
 * @returns {Promise} Promise with available budget
 */
exports.checkAvailableBudget = async (keyAccountId) => {
  try {
    const accountId = String(keyAccountId);
    console.log('Checking budget for account:', accountId);

    const rows = await db.query(
      `SELECT 
         id,
         COALESCE(total_budget, 0) AS total_budget,
         COALESCE(used_amount, 0) AS used_amount,
         (COALESCE(total_budget, 0) - COALESCE(used_amount, 0)) AS available_amount
       FROM budget_key_accounts
       WHERE id = ?`,
      [accountId]
    );

    console.log('Query results:', rows);

    if (!rows || rows.length === 0) {
      console.log(`Account ${accountId} not found`);
      return { total_budget: 0, used_amount: 0, available_amount: 0 };
    }

    const result = rows[0];

    return {
      id: result.id,
      total_budget: parseFloat(result.total_budget),
      used_amount: parseFloat(result.used_amount),
      available_amount: parseFloat(result.available_amount)
    };
  } catch (err) {
    console.error('Error in checkAvailableBudget:', err);
    throw err;
  }
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

/**
 * Save draft credit request
 * @param {Object} requestData - Draft request data
 * @returns {Promise} Promise with insert/update result
 */
exports.saveDraftCreditRequest = async (requestData) => {
  const { user_id, department_id, entries, status = 'draft' } = requestData;
  
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    for (const entry of entries) {
      const query = `
        INSERT INTO budget_withdrawal_requests
          (user_id, department_id, key_account_id, amount, reason, status, version)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          amount = VALUES(amount),
          reason = VALUES(reason),
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await connection.query(query, [
        user_id,
        department_id,
        entry.key_account_id,
        entry.amount || 0,
        entry.reason,
        status
      ]);
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
 * Get user draft credit requests
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with draft requests
 */
exports.getUserDraftCreditRequests = async (userId) => {
  const query = `
    SELECT wr.*,
           d.name as department_name,
           ka.name as account_name,
           ka.account_type
    FROM budget_withdrawal_requests wr
    JOIN budget_departments d ON wr.department_id = d.id
    JOIN budget_key_accounts ka ON wr.key_account_id = ka.id
    WHERE wr.user_id = ? AND wr.status = 'draft'
    ORDER BY wr.created_at DESC
  `;
  
  return db.query(query, [userId]);
};

module.exports = exports;