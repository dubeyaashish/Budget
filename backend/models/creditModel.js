// backend/models/creditModel.js
const db = require('../config/db');

/**
 * Get budget master data
 * @returns {Promise} Promise with budget master data
 */
exports.getBudgetMasterData = async () => {
  try {
    const rows = await db.query(`
      SELECT 
        ka.id as key_account,
        ka.name as key_account_name,
        ka.account_type as type,
        ka.total_budget as overall,
        d.id as department,
        d.name as department_name,
        COALESCE(bm.amount, 0) as amount
      FROM budget_key_accounts ka
      CROSS JOIN budget_departments d
      LEFT JOIN budget_master bm ON ka.id = bm.key_account AND d.name = bm.department
      ORDER BY d.name ASC, ka.name ASC
    `);
    return rows;
  } catch (error) {
    console.error('Error fetching budget master data:', error);
    throw error;
  }
};

/**
 * Get department budget master data
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with budget master data for department
 */
exports.getDepartmentBudgetMasterData = async (departmentId) => {
  try {
    // First, find the department name for the given ID
    const deptQuery = `SELECT id, name, description FROM budget_departments WHERE id = ?`;
    const deptResults = await db.query(deptQuery, [departmentId]);
    
    if (deptResults.length === 0) {
      console.log(`No department found with ID ${departmentId}`);
      return [];
    }
    
    const departmentInfo = deptResults[0];
    const departmentName = departmentInfo.name;
    
    // Get budget master data for this department
    const rows = await db.query(`
      SELECT 
        ka.id as key_account,
        ka.name as key_account_name,
        ka.account_type as type,
        ka.total_budget as overall,
        ? as department,
        ? as department_name,
        COALESCE(bm.amount, 0) as amount
      FROM budget_key_accounts ka
      LEFT JOIN budget_master bm ON ka.id = bm.key_account AND bm.department = ?
      ORDER BY ka.name ASC
    `, [departmentId, departmentName, departmentName]);
    
    return rows;
  } catch (error) {
    console.error(`Error fetching budget master data for department ${departmentId}:`, error);
    throw error;
  }
};

/**
 * Create a credit request
 * @param {Object} requestData - Credit request data
 * @returns {Promise} Promise with insert result
 */
exports.createCreditRequest = async (requestData) => {
  const connection = await db.pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Insert entries for the request
    const entries = [];
    for (const entry of requestData.entries) {
      const result = await db.query(
        `INSERT INTO budget_withdrawal_requests
         (user_id, department_id, key_account_id, amount, reason, status, version, parent_request_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          requestData.user_id, 
          requestData.department_id, 
          entry.key_account_id, 
          entry.amount, 
          entry.reason, 
          requestData.status || 'pending', 
          requestData.version || 1,
          requestData.parent_request_id || null
        ]
      );
      entries.push({
        id: result.insertId,
        key_account_id: entry.key_account_id,
        amount: entry.amount,
        reason: entry.reason
      });
    }
    
    await connection.commit();
    return { success: true, entries };
  } catch (error) {
    await connection.rollback();
    console.error('Error creating credit request:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get latest user credit request
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with latest request
 */
exports.getLatestUserCreditRequest = async (userId) => {
  try {
    const rows = await db.query(`
      SELECT r.*, d.name as department_name,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN budget_key_accounts ka ON r.key_account_id = ka.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 1`,
      [userId]
    );
    return rows[0];
  } catch (error) {
    console.error('Error in getLatestUserCreditRequest:', error);
    throw error;
  }
};

/**
 * Get all user credit requests
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with user's requests
 */
exports.getUserCreditRequests = async (userId) => {
  try {
    const rows = await db.query(`
      SELECT r.*, d.name as department_name,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN budget_key_accounts ka ON r.key_account_id = ka.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error in getUserCreditRequests:', error);
    throw error;
  }
};

/**
 * Get all pending revision requests for a user
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with revision requests
 */
exports.getUserCreditRevisionRequests = async (userId) => {
  try {
    const query = `
      SELECT r.*, d.name as department_name,
             ka.name as account_name, ka.account_type,
             COALESCE(a.name, '') as admin_name, COALESCE(a.surname, '') as admin_surname
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN budget_key_accounts ka ON r.key_account_id = ka.id
      LEFT JOIN budget_users a ON r.reviewed_by = a.id
      WHERE r.user_id = ? AND r.status = 'revision'
      ORDER BY r.updated_at DESC
    `;
    
    const revisionRequests = await db.query(query, [userId]);
    
    return revisionRequests;
  } catch (error) {
    console.error('Error fetching user revision requests:', error);
    throw error;
  }
};

/**
 * Get all pending requests for admin review
 * @returns {Promise} Promise with pending requests
 */
exports.getAllPendingRequests = async () => {
  try {
    const rows = await db.query(`
      SELECT r.*, d.name as department_name,
             u.name as requester_name, u.surname as requester_surname,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN budget_users u ON r.user_id = u.id
      JOIN budget_key_accounts ka ON r.key_account_id = ka.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error('Error in getAllPendingRequests:', error);
    throw error;
  }
};

/**
 * Get all requests in revision status for admin
 * @returns {Promise} Promise with revision requests
 */
exports.getAllRevisionRequests = async () => {
  try {
    const rows = await db.query(`
      SELECT r.*, d.name as department_name,
             u.name as requester_name, u.surname as requester_surname,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN budget_users u ON r.user_id = u.id
      JOIN budget_key_accounts ka ON r.key_account_id = ka.id
      WHERE r.status = 'revision'
      ORDER BY r.created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error('Error in getAllRevisionRequests:', error);
    throw error;
  }
};

/**
 * Get a credit request by ID
 * @param {Number} requestId - Request ID
 * @returns {Promise} Promise with request data
 */
exports.getCreditRequestById = async (requestId) => {
  try {
    const rows = await db.query(`
      SELECT r.*, d.name as department_name,
             u.name as requester_name, u.surname as requester_surname,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN budget_users u ON r.user_id = u.id
      JOIN budget_key_accounts ka ON r.key_account_id = ka.id
      WHERE r.id = ?`,
      [requestId]
    );
    
    return rows[0] || null;
  } catch (error) {
    console.error('Error in getCreditRequestById:', error);
    throw error;
  }
};

/**
 * Approve a credit request (admin only)
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin user ID
 * @param {String} feedback - Optional feedback
 * @returns {Promise} Promise with approval result
 */
exports.approveCreditRequest = async (requestId, adminId, feedback = null) => {
  try {
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    // Update request status
    await db.query(
      `UPDATE budget_withdrawal_requests
       SET status = 'approved', feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [feedback, adminId, requestId]
    );
    
    // Get the request details
    const rows = await db.query(
      `SELECT * FROM budget_withdrawal_requests WHERE id = ?`,
      [requestId]
    );
    
    if (rows.length === 0) {
      throw new Error('Request not found');
    }
    
    const request = rows[0];
    
    // Record transaction
    await db.query(
      `INSERT INTO budget_transactions
       (request_id, key_account_id, amount, admin_id, transaction_date)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [requestId, request.key_account_id, request.amount, adminId]
    );
    
    // Record history
    await db.query(
      `INSERT INTO budget_withdrawal_history
       (request_id, previous_status, new_status, changed_by, change_reason)
       VALUES (?, ?, 'approved', ?, ?)`,
      [requestId, request.status, adminId, feedback || 'Request approved']
    );
    
    await db.promisePool.query('COMMIT');
    return { success: true };
  } catch (error) {
    await db.promisePool.query('ROLLBACK');
    console.error('Error approving credit request:', error);
    throw error;
  }
};

/**
 * Reject a credit request (admin only)
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin user ID
 * @param {String} reason - Rejection reason
 * @returns {Promise} Promise with rejection result
 */
exports.rejectCreditRequest = async (requestId, adminId, reason) => {
  try {
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    // Get current status
    const [requestResult] = await db.query(
      `SELECT status FROM budget_withdrawal_requests WHERE id = ?`,
      [requestId]
    );
    
    if (!requestResult) {
      throw new Error('Request not found');
    }
    
    const previousStatus = requestResult.status;
    
    // Update request status
    await db.query(
      `UPDATE budget_withdrawal_requests
       SET status = 'rejected', feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason, adminId, requestId]
    );
    
    // Record history
    await db.query(
      `INSERT INTO budget_withdrawal_history
       (request_id, previous_status, new_status, changed_by, change_reason)
       VALUES (?, ?, 'rejected', ?, ?)`,
      [requestId, previousStatus, adminId, reason]
    );
    
    await db.promisePool.query('COMMIT');
    return { success: true };
  } catch (error) {
    await db.promisePool.query('ROLLBACK');
    console.error('Error rejecting credit request:', error);
    throw error;
  }
};

/**
 * Create a revision request with admin feedback
 * @param {Number} requestId - Original request ID
 * @param {Number} adminId - Admin user ID
 * @param {String} feedback - Admin feedback
 * @param {Number} suggestedAmount - Admin suggested amount (optional)
 * @returns {Promise} Promise with revision result
 */
exports.createRevisionRequest = async (requestId, adminId, feedback, suggestedAmount = null) => {
  try {
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    // Get current status
    const [requestResult] = await db.query(
      `SELECT status FROM budget_withdrawal_requests WHERE id = ?`,
      [requestId]
    );
    
    if (!requestResult) {
      throw new Error('Request not found');
    }
    
    const previousStatus = requestResult.status;
    
    // Mark the original request as in revision
    const updateQuery = `
      UPDATE budget_withdrawal_requests 
      SET 
        status = 'revision', 
        feedback = ?, 
        suggested_amount = ?, 
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await db.query(updateQuery, [feedback, suggestedAmount, adminId, requestId]);
    
    // Create a revision history entry
    const historyQuery = `
      INSERT INTO budget_withdrawal_history
      (request_id, previous_status, new_status, changed_by, change_reason)
      VALUES (?, ?, 'revision', ?, ?)
    `;
    
    await db.query(historyQuery, [requestId, previousStatus, adminId, feedback]);
    
    await db.promisePool.query('COMMIT');
    
    return { 
      success: true, 
      requestId
    };
  } catch (error) {
    await db.promisePool.query('ROLLBACK');
    console.error('Error creating revision request:', error);
    throw error;
  }
};

/**
 * Update a revision request (by user)
 * @param {Number} requestId - Request ID in revision status
 * @param {Number} userId - User updating the revision
 * @param {Object} updateData - Updated request data
 * @returns {Promise} Promise with update result
 */
exports.updateRevisionRequest = async (requestId, userId, updateData) => {
  try {
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    // Get the original request to ensure it belongs to the user
    const originalQuery = `
      SELECT * FROM budget_withdrawal_requests
      WHERE id = ? AND user_id = ? AND status = 'revision'
    `;
    
    const [originalRequest] = await db.query(originalQuery, [requestId, userId]);
    
    if (!originalRequest) {
      throw new Error('Request not found or not in revision status');
    }
    
    // Create new version of the request
    const currentVersion = originalRequest.version || 1;
    const newVersion = currentVersion + 1;
    
    // Insert the new version
    const insertQuery = `
      INSERT INTO budget_withdrawal_requests
      (
        user_id, department_id, key_account_id, amount, reason, 
        status, version, parent_request_id, previous_amount, 
        created_at
      )
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const result = await db.query(
      insertQuery,
      [
        userId,
        originalRequest.department_id,
        updateData.key_account_id || originalRequest.key_account_id,
        updateData.amount,
        updateData.reason || originalRequest.reason,
        newVersion,
        requestId,
        originalRequest.amount
      ]
    );
    
    const newRequestId = result.insertId;
    
    // Update the status of the original request to show it's been revised
    const updateOriginalQuery = `
      UPDATE budget_withdrawal_requests
      SET status = 'revised', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await db.query(updateOriginalQuery, [requestId]);
    
    // Create a history record
    const historyQuery = `
      INSERT INTO budget_withdrawal_history
      (request_id, previous_status, new_status, changed_by, change_reason, new_request_id)
      VALUES (?, 'revision', 'revised', ?, 'User submitted revised version', ?)
    `;
    
    await db.query(historyQuery, [requestId, userId, newRequestId]);
    
    await db.promisePool.query('COMMIT');
    
    return { 
      success: true,
      originalRequestId: requestId,
      newRequestId: newRequestId,
      version: newVersion
    };
  } catch (error) {
    await db.promisePool.query('ROLLBACK');
    console.error('Error updating revision request:', error);
    throw error;
  }
};

/**
 * Resolve a revision request (admin only)
 * @param {Number} requestId - Request ID
 * @param {Number} adminId - Admin user ID
 * @returns {Promise} Promise with resolve result
 */
exports.resolveRevision = async (requestId, adminId) => {
  try {
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    // Get current status
    const [requestResult] = await db.query(
      `SELECT status FROM budget_withdrawal_requests WHERE id = ?`,
      [requestId]
    );
    
    if (!requestResult) {
      throw new Error('Request not found');
    }
    
    const previousStatus = requestResult.status;
    
    // Update request status to pending for re-review
    await db.query(
      `UPDATE budget_withdrawal_requests
       SET status = 'pending', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [adminId, requestId]
    );
    
    // Record history
    await db.query(
      `INSERT INTO budget_withdrawal_history
       (request_id, previous_status, new_status, changed_by, change_reason)
       VALUES (?, ?, 'pending', ?, 'Revision resolved')`,
      [requestId, previousStatus, adminId]
    );
    
    await db.promisePool.query('COMMIT');
    return { success: true };
  } catch (error) {
    await db.promisePool.query('ROLLBACK');
    console.error('Error resolving revision:', error);
    throw error;
  }
};

/**
 * Get all versions of a credit request
 * @param {Number} requestId - Request ID
 * @returns {Promise} Promise with all versions
 */
exports.getCreditRequestVersions = async (requestId) => {
  try {
    // First, check if this request is a child version
    const parentCheckQuery = `
      SELECT parent_request_id FROM budget_withdrawal_requests
      WHERE id = ?
    `;
    
    const [parentCheck] = await db.query(parentCheckQuery, [requestId]);
    
    let rootRequestId = requestId;
    
    // If it has a parent, use that as the root
    if (parentCheck && parentCheck.parent_request_id) {
      // Find the ultimate parent
      let currentParentId = parentCheck.parent_request_id;
      let foundRoot = false;
      
      while (!foundRoot) {
        const [parentResult] = await db.query(parentCheckQuery, [currentParentId]);
        
        if (!parentResult || !parentResult.parent_request_id) {
          // This is the root
          rootRequestId = currentParentId;
          foundRoot = true;
        } else {
          // Move up the chain
          currentParentId = parentResult.parent_request_id;
        }
      }
    }
    
    // Now get all versions linked to this root, including the root itself
    // And all requests that have this root as their parent
    const versionsQuery = `
      WITH RECURSIVE request_tree AS (
        /* Base case: the root request */
        SELECT * FROM budget_withdrawal_requests WHERE id = ?
        
        UNION ALL
        
        /* Recursive case: all requests with parent_request_id matching any request in the tree */
        SELECT r.*
        FROM budget_withdrawal_requests r
        JOIN request_tree rt ON r.parent_request_id = rt.id
      )
      SELECT 
        rt.*, 
        d.name as department_name,
        u.name as requester_name, u.surname as requester_surname,
        ka.name as account_name, ka.account_type,
        rev.name as reviewer_name, rev.surname as reviewer_surname  
      FROM request_tree rt
      JOIN budget_departments d ON rt.department_id = d.id
      JOIN budget_users u ON rt.user_id = u.id
      JOIN budget_key_accounts ka ON rt.key_account_id = ka.id
      LEFT JOIN budget_users rev ON rt.reviewed_by = rev.id
      ORDER BY rt.version ASC
    `;
    
    const versions = await db.query(versionsQuery, [rootRequestId]);
    
    return versions;
  } catch (error) {
    console.error('Error getting credit request versions:', error);
    throw error;
  }
};

/**
 * Check available budget for a key account
 * @param {String} accountId - Key account ID
 * @returns {Promise} Promise with available budget
 */
exports.checkAvailableBudget = async (accountId) => {
  try {
    // Get total budget for account
    const [accountData] = await db.query(
      `SELECT total_budget FROM budget_key_accounts WHERE id = ?`,
      [accountId]
    );
    
    if (!accountData) {
      return { available: 0, total: 0, used: 0 };
    }
    
    // Get used amount
    const [usedResult] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as used_amount
       FROM budget_transactions
       WHERE key_account_id = ?`,
      [accountId]
    );
    
    const totalBudget = parseFloat(accountData.total_budget) || 0;
    const usedAmount = parseFloat(usedResult.used_amount) || 0;
    const availableAmount = totalBudget - usedAmount;
    
    return {
      available: availableAmount,
      total: totalBudget,
      used: usedAmount
    };
  } catch (error) {
    console.error('Error checking available budget:', error);
    throw error;
  }
};

/**
 * Get department spending summary
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with spending summary
 */
exports.getDepartmentSpendingSummary = async (departmentId) => {
  try {
    const rows = await db.query(`
      SELECT ka.account_type, SUM(t.amount) as total_spent
       FROM budget_transactions t
       JOIN budget_key_accounts ka ON t.key_account_id = ka.id
       JOIN budget_withdrawal_requests r ON t.request_id = r.id
       WHERE r.department_id = ?
       GROUP BY ka.account_type
       ORDER BY total_spent DESC`,
      [departmentId]
    );
    return rows;
  } catch (error) {
    console.error('Error getting department spending summary:', error);
    throw error;
  }
};

/**
 * Save a draft credit request
 * @param {Object} userData - Draft request data
 * @returns {Promise} Promise with save result
 */
exports.saveDraftCreditRequest = async (userData) => {
  try {
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    // Insert entries for the request as drafts
    const entries = [];
    for (const entry of userData.entries) {
      if (!entry.key_account_id) continue;
      
      const result = await db.query(
        `INSERT INTO budget_withdrawal_requests
         (user_id, department_id, key_account_id, amount, reason, status, version)
         VALUES (?, ?, ?, ?, ?, 'draft', 1)`,
        [
          userData.user_id, 
          userData.department_id, 
          entry.key_account_id, 
          entry.amount || 0, 
          entry.reason || '', 
        ]
      );
      entries.push({
        id: result.insertId,
        key_account_id: entry.key_account_id,
        amount: entry.amount || 0,
        reason: entry.reason || ''
      });
    }
    
    await db.promisePool.query('COMMIT');
    return { success: true, entries };
  } catch (error) {
    await db.promisePool.query('ROLLBACK');
    console.error('Error saving draft credit request:', error);
    throw error;
  }
};

/**
 * Get user draft credit requests
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with draft requests
 */
exports.getUserDraftCreditRequests = async (userId) => {
  try {
    const rows = await db.query(`
      SELECT r.*, d.name as department_name,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN budget_key_accounts ka ON r.key_account_id = ka.id
      WHERE r.user_id = ? AND r.status = 'draft'
      ORDER BY r.created_at DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error in getUserDraftCreditRequests:', error);
    throw error;
  }
};

module.exports = exports;