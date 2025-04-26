// backend/models/creditModel.js
const db = require('../config/db');

exports.getBudgetMasterData = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ka.id as key_account,
        ka.name as key_account_name,
        ka.account_type as type,
        ka.total_budget as amount,
        d.id as department,
        d.name as department_name
      FROM key_accounts ka
      JOIN budget_departments d ON 1=1
      ORDER BY d.name ASC, ka.name ASC
    `);
    return rows;
  } catch (error) {
    console.error('Error fetching budget master data:', error);
    throw error;
  }
};

exports.getDepartmentBudgetMasterData = async (departmentId) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ka.id as key_account,
        ka.name as key_account_name,
        ka.account_type as type,
        ka.total_budget as amount,
        d.id as department,
        d.name as department_name
      FROM key_accounts ka
      JOIN budget_departments d ON d.id = ?
      ORDER BY ka.name ASC
    `, [departmentId]);
    return rows;
  } catch (error) {
    console.error(`Error fetching budget master data for department ${departmentId}:`, error);
    throw error;
  }
};

exports.createCreditRequest = async (userData) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Insert entries for the request
    const entries = [];
    for (const entry of userData.entries) {
      const [result] = await connection.query(
        `INSERT INTO budget_withdrawal_requests
         (user_id, department_id, key_account_id, amount, reason, status, version)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.user_id, 
          userData.department_id, 
          entry.key_account_id, 
          entry.amount, 
          entry.reason, 
          'pending', 
          1
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

exports.getLatestUserCreditRequest = async (userId) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, d.name as department_name,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN key_accounts ka ON r.key_account_id = ka.id
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

exports.getUserCreditRequests = async (userId) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, d.name as department_name,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN key_accounts ka ON r.key_account_id = ka.id
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

exports.getUserRevisionRequests = async (userId) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, d.name as department_name,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN key_accounts ka ON r.key_account_id = ka.id
      WHERE r.user_id = ? AND r.status = 'revision'
      ORDER BY r.created_at DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error in getUserRevisionRequests:', error);
    throw error;
  }
};

exports.getAllPendingRequests = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, d.name as department_name,
             u.name as requester_name, u.surname as requester_surname,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN users u ON r.user_id = u.id
      JOIN key_accounts ka ON r.key_account_id = ka.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error('Error in getAllPendingRequests:', error);
    throw error;
  }
};

exports.getAllRevisionRequests = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, d.name as department_name,
             u.name as requester_name, u.surname as requester_surname,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN users u ON r.user_id = u.id
      JOIN key_accounts ka ON r.key_account_id = ka.id
      WHERE r.status = 'revision'
      ORDER BY r.created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error('Error in getAllRevisionRequests:', error);
    throw error;
  }
};

exports.getCreditRequestById = async (requestId) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, d.name as department_name,
             u.name as requester_name, u.surname as requester_surname,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN users u ON r.user_id = u.id
      JOIN key_accounts ka ON r.key_account_id = ka.id
      WHERE r.id = ?`,
      [requestId]
    );
    
    return rows[0] || null;
  } catch (error) {
    console.error('Error in getCreditRequestById:', error);
    throw error;
  }
};

exports.approveCreditRequest = async (requestId, adminId, feedback) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Update request status
    await connection.query(
      `UPDATE budget_withdrawal_requests
       SET status = 'approved', feedback = ?
       WHERE id = ?`,
      [feedback, requestId]
    );
    
    // Get the request details
    const [rows] = await connection.query(
      `SELECT * FROM budget_withdrawal_requests WHERE id = ?`,
      [requestId]
    );
    
    if (rows.length === 0) {
      throw new Error('Request not found');
    }
    
    const request = rows[0];
    
    // Record transaction
    await connection.query(
      `INSERT INTO budget_transactions
       (request_id, key_account_id, amount, admin_id)
       VALUES (?, ?, ?, ?)`,
      [requestId, request.key_account_id, request.amount, adminId]
    );
    
    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error approving credit request:', error);
    throw error;
  } finally {
    connection.release();
  }
};

exports.createRevisionVersion = async (requestId, feedback, amount) => {
  try {
    // Update the request status
    await pool.query(
      `UPDATE budget_withdrawal_requests
       SET status = 'revision', feedback = ?, suggested_amount = ?
       WHERE id = ?`,
      [feedback, amount, requestId]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error creating revision version:', error);
    throw error;
  }
};

exports.updateRevisionVersion = async (requestId, userData) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get the original request
    const [originalRequest] = await connection.query(
      `SELECT * FROM budget_withdrawal_requests WHERE id = ?`,
      [requestId]
    );
    
    if (originalRequest.length === 0) {
      throw new Error('Request not found');
    }
    
    const original = originalRequest[0];
    const currentVersion = original.version;
    
    // Create a new version
    const [result] = await connection.query(
      `INSERT INTO budget_withdrawal_requests
       (user_id, department_id, key_account_id, amount, reason, status, version, parent_request_id)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        original.user_id,
        original.department_id,
        userData.key_account_id,
        userData.amount,
        userData.reason,
        currentVersion + 1,
        requestId
      ]
    );
    
    const newRequestId = result.insertId;
    
    await connection.commit();
    return { success: true, requestId: newRequestId };
  } catch (error) {
    await connection.rollback();
    console.error('Error updating revision version:', error);
    throw error;
  } finally {
    connection.release();
  }
};

exports.resolveRevision = async (requestId) => {
  try {
    await pool.query(
      `UPDATE budget_withdrawal_requests
       SET status = 'pending'
       WHERE id = ?`,
      [requestId]
    );
    return { success: true };
  } catch (error) {
    console.error('Error resolving revision:', error);
    throw error;
  }
};

exports.getDepartmentSpendingSummary = async (departmentId) => {
  try {
    const [rows] = await pool.query(`
      SELECT ka.account_type, SUM(t.amount) as total_spent
       FROM budget_transactions t
       JOIN key_accounts ka ON t.key_account_id = ka.id
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

exports.saveDraftCreditRequest = async (userData) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Insert entries for the request as drafts
    const entries = [];
    for (const entry of userData.entries) {
      if (!entry.key_account_id) continue;
      
      const [result] = await connection.query(
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
    
    await connection.commit();
    return { success: true, entries };
  } catch (error) {
    await connection.rollback();
    console.error('Error saving draft credit request:', error);
    throw error;
  } finally {
    connection.release();
  }
};

exports.getUserDraftCreditRequests = async (userId) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, d.name as department_name,
             ka.name as account_name, ka.account_type
      FROM budget_withdrawal_requests r
      JOIN budget_departments d ON r.department_id = d.id
      JOIN key_accounts ka ON r.key_account_id = ka.id
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