const db = require('../config/db');

/**
 * Get budget master data
 * @returns {Promise} Promise with budget master data
 */
exports.getBudgetMasterData = async () => {
  const query = `
    SELECT *
    FROM budget_master
    ORDER BY department, type, key_account
  `;
  return db.query(query);
};

/**
 * Create credit request with multiple entries
 * @param {Object} requestData - Credit request data
 * @returns {Promise} Promise with insert result
 */
exports.createCreditRequest = async (requestData) => {
  const {
    user_id,
    department_id,
    entries,
    version = 1,
    status = 'pending',
    parent_request_id = null
  } = requestData;
  
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Insert the main request header
    const [headerResult] = await connection.query(
      `INSERT INTO budget_withdrawal_requests_header
       (user_id, department_id, version, status, parent_request_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, department_id, version, status, parent_request_id]
    );
    
    const requestId = headerResult.insertId;
    
    // Insert all the entries
    for (const entry of entries) {
      await connection.query(
        `INSERT INTO budget_withdrawal_requests
         (request_id, key_account_id, amount, reason) 
         VALUES (?, ?, ?, ?)`,
        [requestId, entry.key_account_id, entry.amount, entry.reason]
      );
    }
    
    await connection.commit();
    return { requestId };
  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Save draft credit request
 * @param {Object} requestData - Draft request data
 * @returns {Promise} Promise with insert/update result
 */
exports.saveDraftCreditRequest = async (requestData) => {
  const { 
    user_id, 
    department_id, 
    entries, 
    version = 1,
    status = 'draft',
    request_id = null
  } = requestData;
  
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    let requestId = request_id;
    
    // If no request_id, create new header
    if (!requestId) {
      const [headerResult] = await connection.query(
        `INSERT INTO budget_withdrawal_requests_header
         (user_id, department_id, version, status)
         VALUES (?, ?, ?, ?)`,
        [user_id, department_id, version, status]
      );
      
      requestId = headerResult.insertId;
    } else {
      // Update existing header
      await connection.query(
        `UPDATE budget_withdrawal_requests_header
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, requestId]
      );
      
      // Delete existing entries to replace with new ones
      await connection.query(
        `DELETE FROM budget_withdrawal_requests
         WHERE request_id = ?`,
        [requestId]
      );
    }
    
    // Insert all entries
    for (const entry of entries) {
      await connection.query(
        `INSERT INTO budget_withdrawal_requests
         (request_id, key_account_id, amount, reason) 
         VALUES (?, ?, ?, ?)`,
        [requestId, entry.key_account_id, entry.amount || 0, entry.reason || '']
      );
    }
    
    await connection.commit();
    return { requestId };
  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get department budget master data
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with budget master data for department
 */
exports.getDepartmentBudgetMasterData = async (departmentId) => {
  try {
    const query = `
      SELECT *
      FROM budget_master
      WHERE department = ?
      ORDER BY type, key_account
    `;
    return db.query(query, [departmentId]);
  } catch (error) {
    console.error('Error in getDepartmentBudgetMasterData:', error);
    throw error;
  }
};

/**
 * Get user's latest credit request
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with credit request data
 */
exports.getLatestUserCreditRequest = async (userId) => {
  try {
    // Get the latest request header
    const [headers] = await db.promisePool.query(
      `SELECT h.*, d.name as department_name
       FROM budget_withdrawal_requests_header h
       JOIN budget_departments d ON h.department_id = d.id
       WHERE h.user_id = ?
       ORDER BY h.created_at DESC
       LIMIT 1`,
      [userId]
    );
    
    if (!headers || headers.length === 0) {
      return null;
    }
    
    const header = headers[0];
    
    // Get all entries for this request
    const [entries] = await db.promisePool.query(
      `SELECT r.*, ka.name as key_account_name, ka.account_type
       FROM budget_withdrawal_requests r
       JOIN budget_key_accounts ka ON r.key_account_id = ka.id
       WHERE r.request_id = ?`,
      [header.id]
    );
    
    return {
      id: header.id,
      department_id: header.department_id,
      department_name: header.department_name,
      user_id: header.user_id,
      version: header.version,
      status: header.status,
      parent_request_id: header.parent_request_id,
      created_at: header.created_at,
      updated_at: header.updated_at,
      entries: entries.map(entry => ({
        key_account_id: entry.key_account_id,
        key_account_name: entry.key_account_name,
        amount: parseFloat(entry.amount),
        reason: entry.reason,
        account_type: entry.account_type
      }))
    };
  } catch (error) {
    console.error('Error in getLatestUserCreditRequest:', error);
    throw error;
  }
};

/**
 * Get user credit requests
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with credit requests
 */
exports.getUserCreditRequests = async (userId) => {
  try {
    const [requests] = await db.promisePool.query(
      `SELECT h.*, d.name as department_name,
              COUNT(r.id) as entry_count,
              SUM(r.amount) as total_amount
       FROM budget_withdrawal_requests_header h
       JOIN budget_departments d ON h.department_id = d.id
       LEFT JOIN budget_withdrawal_requests r ON h.id = r.request_id
       WHERE h.user_id = ?
       GROUP BY h.id
       ORDER BY h.created_at DESC`,
      [userId]
    );
    
    return requests;
  } catch (error) {
    console.error('Error in getUserCreditRequests:', error);
    throw error;
  }
};

/**
 * Get all pending credit requests (admin only)
 * @returns {Promise} Promise with pending requests
 */
exports.getAllPendingRequests = async () => {
  try {
    const [requests] = await db.promisePool.query(
      `SELECT h.*, d.name as department_name,
              COUNT(r.id) as entry_count,
              SUM(r.amount) as total_amount,
              CONCAT(u.name, ' ', u.surname) as requester_name
       FROM budget_withdrawal_requests_header h
       JOIN budget_departments d ON h.department_id = d.id
       JOIN budget_users u ON h.user_id = u.id
       LEFT JOIN budget_withdrawal_requests r ON h.id = r.request_id
       WHERE h.status = 'pending' AND h.parent_request_id IS NULL
       GROUP BY h.id
       ORDER BY h.created_at ASC`
    );
    
    return requests;
  } catch (error) {
    console.error('Error in getAllPendingRequests:', error);
    throw error;
  }
};

/**
 * Get all revision credit requests
 * @returns {Promise} Promise with revision requests
 */
exports.getAllRevisionRequests = async () => {
  try {
    const [requests] = await db.promisePool.query(
      `SELECT h.*, d.name as department_name,
              COUNT(r.id) as entry_count,
              SUM(r.amount) as total_amount,
              CONCAT(u.name, ' ', u.surname) as requester_name,
              CONCAT(a.name, ' ', a.surname) as reviewer_name
       FROM budget_withdrawal_requests_header h
       JOIN budget_departments d ON h.department_id = d.id
       JOIN budget_users u ON h.user_id = u.id
       LEFT JOIN budget_users a ON h.reviewed_by = a.id
       LEFT JOIN budget_withdrawal_requests r ON h.id = r.request_id
       WHERE h.status = 'revision'
       GROUP BY h.id
       ORDER BY h.updated_at DESC`
    );
    
    return requests;
  } catch (error) {
    console.error('Error in getAllRevisionRequests:', error);
    throw error;
  }
};

/**
 * Get user revision credit requests
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with revision requests
 */
exports.getUserCreditRevisionRequests = async (userId) => {
  try {
    const [requests] = await db.promisePool.query(
      `SELECT h.*, d.name as department_name,
              COUNT(r.id) as entry_count,
              SUM(r.amount) as total_amount,
              CONCAT(a.name, ' ', a.surname) as reviewer_name
       FROM budget_withdrawal_requests_header h
       JOIN budget_departments d ON h.department_id = d.id
       LEFT JOIN budget_users a ON h.reviewed_by = a.id
       LEFT JOIN budget_withdrawal_requests r ON h.id = r.request_id
       WHERE h.status = 'revision' AND h.user_id = ?
       GROUP BY h.id
       ORDER BY h.updated_at DESC`,
      [userId]
    );
    
    return requests;
  } catch (error) {
    console.error('Error in getUserCreditRevisionRequests:', error);
    throw error;
  }
};

/**
 * Get credit request by ID
 * @param {Number} requestId - Request ID
 * @returns {Promise} Promise with request details
 */
exports.getCreditRequestById = async (requestId) => {
  try {
    // Get the request header
    const [headers] = await db.promisePool.query(
      `SELECT h.*, d.name as department_name,
              CONCAT(u.name, ' ', u.surname) as requester_name,
              CONCAT(a.name, ' ', a.surname) as approver_name
       FROM budget_withdrawal_requests_header h
       JOIN budget_departments d ON h.department_id = d.id
       JOIN budget_users u ON h.user_id = u.id
       LEFT JOIN budget_users a ON h.approved_by = a.id
       WHERE h.id = ?`,
      [requestId]
    );
    
    if (!headers || headers.length === 0) {
      return null;
    }
    
    const header = headers[0];
    
    // Get all entries for this request
    const [entries] = await db.promisePool.query(
      `SELECT r.*, ka.name as key_account_name, ka.account_type
       FROM budget_withdrawal_requests r
       JOIN budget_key_accounts ka ON r.key_account_id = ka.id
       WHERE r.request_id = ?`,
      [requestId]
    );
    
    return {
      ...header,
      entries: entries.map(entry => ({
        id: entry.id,
        key_account_id: entry.key_account_id,
        key_account_name: entry.key_account_name,
        amount: parseFloat(entry.amount),
        reason: entry.reason,
        account_type: entry.account_type
      }))
    };
  } catch (error) {
    console.error('Error in getCreditRequestById:', error);
    throw error;
  }
};

/**
 * Approve credit request (admin only)
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin ID approving the request
 * @returns {Promise} Promise with update result
 */
exports.approveCreditRequest = async (requestId, adminId) => {
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get request details
    const [header] = await connection.query(
      `SELECT * FROM budget_withdrawal_requests_header WHERE id = ?`,
      [requestId]
    );
    
    if (!header || header.length === 0) {
      throw new Error('Request not found');
    }
    
    // Get all entries
    const [entries] = await connection.query(
      `SELECT * FROM budget_withdrawal_requests WHERE request_id = ?`,
      [requestId]
    );
    
    // Update the request status
    await connection.query(
      `UPDATE budget_withdrawal_requests_header
       SET status = 'approved', approved_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status IN ('pending', 'revision')`,
      [adminId, requestId]
    );
    
    // Update the used amount in all key accounts
    for (const entry of entries) {
      await connection.query(
        `UPDATE budget_key_accounts
         SET used_amount = used_amount + ?
         WHERE id = ?`,
        [entry.amount, entry.key_account_id]
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
 * Create revision request (admin only)
 * @param {Number} requestId - Original Request ID
 * @param {Number} adminId - Admin ID
 * @param {String} feedback - Feedback
 * @returns {Promise} Promise with insert result
 */
exports.createRevisionRequest = async (requestId, adminId, feedback) => {
  const connection = await db.promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get the original request
    const [headers] = await connection.query(
      `SELECT * FROM budget_withdrawal_requests_header WHERE id = ?`,
      [requestId]
    );
    
    if (!headers || headers.length === 0) {
      throw new Error('Request not found');
    }
    
    const original = headers[0];
    
    // Get all entries
    const [entries] = await connection.query(
      `SELECT * FROM budget_withdrawal_requests WHERE request_id = ?`,
      [requestId]
    );
    
    // Create a new revision version
    const newVersion = original.version + 1;
    
    const [headerResult] = await connection.query(
      `INSERT INTO budget_withdrawal_requests_header
       (user_id, department_id, version, status, parent_request_id, feedback, reviewed_by)
       VALUES (?, ?, ?, 'revision', ?, ?, ?)`,
      [original.user_id, original.department_id, newVersion, requestId, feedback, adminId]
    );
    
    const newRequestId = headerResult.insertId;
    
    // Copy all entries to the new request
    for (const entry of entries) {
      await connection.query(
        `INSERT INTO budget_withdrawal_requests
         (request_id, key_account_id, amount, reason)
         VALUES (?, ?, ?, ?)`,
        [newRequestId, entry.key_account_id, entry.amount, entry.reason]
      );
    }
    
    // Update the original request status
    await connection.query(
      `UPDATE budget_withdrawal_requests_header
       SET status = 'in_revision', reviewed_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [adminId, requestId]
    );
    
    await connection.commit();
    return { revisionId: newRequestId };
  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Reject credit request (admin only)
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin ID rejecting the request
 * @param {String} reason - Rejection reason
 * @returns {Promise} Promise with update result
 */
exports.rejectCreditRequest = async (requestId, adminId, reason) => {
  try {
    const query = `
      UPDATE budget_withdrawal_requests_header
      SET status = 'rejected',
          approved_by = ?,
          feedback = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status IN ('pending', 'revision')
    `;
    
    return db.query(query, [adminId, reason, requestId]);
  } catch (error) {
    console.error('Error in rejectCreditRequest:', error);
    throw error;
  }
};