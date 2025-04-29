// backend/controllers/creditController.js
const creditModel = require('../models/creditModel');
const keyAccountModel = require('../models/keyAccountModel');
const db = require('../config/db');

/**
 * Get budget master data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBudgetMasterData = async (req, res) => {
  try {
    // Query that matches the actual structure where department contains names
    const query = `
      SELECT 
        bm.type,
        bm.key_account,
        bm.key_account_name,
        bm.overall,
        d.id as department,
        bm.department as department_name,
        bm.amount
      FROM budget_master bm
      JOIN budget_departments d ON bm.department = d.name
      ORDER BY bm.department, bm.type, bm.key_account_name
    `;
    
    const results = await db.query(query);
    
    console.log('Budget Master Data results:', JSON.stringify(results.slice(0, 3), null, 2));
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching budget master data:', error);
    res.status(500).json({ message: 'Server error fetching budget data' });
  }
};

/**
 * Get department budget master data with fuzzy matching
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDepartmentBudgetMasterData = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    console.log(`Fetching budget master data for department ID: ${departmentId}`);
    
    // First, find the department name for the given ID
    const deptQuery = `SELECT id, name, description FROM budget_departments WHERE id = ?`;
    const deptResults = await db.query(deptQuery, [departmentId]);
    
    if (deptResults.length === 0) {
      console.log(`No department found with ID ${departmentId}`);
      return res.json([]);
    }
    
    const departmentInfo = deptResults[0];
    const departmentName = departmentInfo.name;
    console.log(`Found department: "${departmentName}" (${departmentInfo.description || 'No description'}) for ID: ${departmentId}`);
    
    // Get a list of all department names in budget_master
    const deptNamesQuery = `SELECT DISTINCT department FROM budget_master`;
    const deptNames = await db.query(deptNamesQuery);
    console.log(`Found ${deptNames.length} unique department names in budget_master`);
    
    // Try to find a match in available department names
    let matchedDeptName = null;
    
    // First, try exact match
    for (const dept of deptNames) {
      if (dept.department === departmentName) {
        matchedDeptName = dept.department;
        console.log(`Found exact department name match: "${matchedDeptName}"`);
        break;
      }
    }
    
    // If no exact match, try matching with description
    if (!matchedDeptName && departmentInfo.description) {
      for (const dept of deptNames) {
        if (dept.department === departmentInfo.description) {
          matchedDeptName = dept.department;
          console.log(`Found match with department description: "${matchedDeptName}"`);
          break;
        }
      }
    }
    
    // If still no match, try partial matches (contains)
    if (!matchedDeptName) {
      for (const dept of deptNames) {
        if (dept.department && departmentName && 
            (dept.department.includes(departmentName) || 
            departmentName.includes(dept.department) ||
            (departmentInfo.description && dept.department.includes(departmentInfo.description)) ||
            (departmentInfo.description && departmentInfo.description.includes(dept.department)))) {
          matchedDeptName = dept.department;
          console.log(`Found partial match: "${matchedDeptName}"`);
          break;
        }
      }
    }
    
    // If still no match, use the department name we have
    if (!matchedDeptName) {
      console.log(`No matching department found in budget_master for "${departmentName}"`);
      matchedDeptName = departmentName;
    }
    
    // Now query budget_master using the matched department name
    const query = `
      SELECT 
        bm.type,
        bm.key_account,
        bm.key_account_name,
        bm.overall,
        ? as department,
        bm.department as department_name,
        bm.amount
      FROM budget_master bm
      WHERE bm.department = ?
      ORDER BY bm.type, bm.key_account_name
    `;
    
    const results = await db.query(query, [departmentId, matchedDeptName]);
    
    console.log(`Found ${results.length} records for department name: "${matchedDeptName}"`);
    
    // If no results, create a fallback entry from key accounts
    if (results.length === 0) {
      console.log('No data found. Creating fallback data from key accounts...');
      
      // Get key accounts
      const kaQuery = `SELECT id, name, account_type, total_budget FROM budget_key_accounts`;
      const keyAccounts = await db.query(kaQuery);
      
      // Create fallback data
      const fallbackResults = keyAccounts.map(ka => ({
        type: ka.account_type || 'Unknown',
        key_account: ka.id,
        key_account_name: ka.name,
        overall: ka.total_budget || 0,
        department: departmentId,
        department_name: departmentName,
        amount: 0.0000
      }));
      
      console.log(`Created ${fallbackResults.length} fallback entries from key accounts`);
      res.json(fallbackResults);
    } else {
      res.json(results);
    }
  } catch (error) {
    console.error('Error fetching department budget data:', error);
    res.status(500).json({ message: 'Server error fetching department budget data' });
  }
};

/**
 * Create a new credit request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createCreditRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { department_id, entries, version, parent_request_id } = req.body;

    if (!department_id || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    // Validate each entry has required fields
    for (const entry of entries) {
      if (!entry.key_account_id || !entry.amount || entry.amount <= 0) {
        return res.status(400).json({ 
          message: 'Each entry must have a key account and valid amount'
        });
      }
      // Allow reason to be null, undefined, or empty
    }

    // Verify user exists
    const [user] = await db.query('SELECT id FROM budget_users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(400).json({ message: `User with id ${userId} does not exist` });
    }

    // Verify department exists
    const [department] = await db.query('SELECT id FROM budget_departments WHERE id = ?', [department_id]);
    if (!department) {
      return res.status(400).json({ message: `Department with id ${department_id} does not exist` });
    }

    // Verify key_account_ids exist
    for (const entry of entries) {
      const [keyAccount] = await db.query('SELECT id FROM budget_key_accounts WHERE id = ?', [entry.key_account_id]);
      if (!keyAccount) {
        return res.status(400).json({ message: `Key account with id ${entry.key_account_id} does not exist` });
      }
    }

    const requestData = {
      user_id: userId,
      department_id,
      entries,
      version: version || 1,
      parent_request_id,
      status: 'pending'
    };

    const result = await creditModel.createCreditRequest(requestData);

    res.status(201).json({
      message: 'Credit request created successfully',
      entries: result.entries
    });
  } catch (error) {
    console.error('Error creating credit request:', error);
    res.status(500).json({ message: `Server error creating credit request: ${error.message}` });
  }
};

/**
 * Get all user credit requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserCreditRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await creditModel.getUserCreditRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching user credit requests:', error);
    res.status(500).json({ message: 'Server error fetching user credit requests' });
  }
};

/**
 * Get latest user credit request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLatestUserCreditRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Fetching latest credit request for userId: ${userId}`);

    const request = await creditModel.getLatestUserCreditRequest(userId);
    console.log('Response from creditModel.getLatestUserCreditRequest:', JSON.stringify(request, null, 2));

    if (!request) {
      console.log('No credit request found for userId:', userId);
      return res.status(404).json({ message: 'No credit request found' });
    }

    console.log('Sending response to frontend:', JSON.stringify(request, null, 2));
    res.json(request);
  } catch (error) {
    console.error('Error fetching latest credit request for userId:', req.user.id, error);
    res.status(500).json({ message: 'Server error fetching latest credit request' });
  }
};

/**
 * Get all user credit revision requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserCreditRevisionRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await creditModel.getUserCreditRevisionRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching user revision requests:', error);
    res.status(500).json({ message: 'Server error fetching user revision requests' });
  }
};

/**
 * Get all pending credit requests (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllPendingRequests = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    const requests = await creditModel.getAllPendingRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending credit requests:', error);
    res.status(500).json({ message: 'Server error fetching pending credit requests' });
  }
};

/**
 * Get all revision credit requests (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllRevisionRequests = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    const requests = await creditModel.getAllRevisionRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching revision credit requests:', error);
    res.status(500).json({ message: 'Server error fetching revision credit requests' });
  }
};

/**
 * Get credit request by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCreditRequestById = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await creditModel.getCreditRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Credit request not found' });
    }
    res.json(request);
  } catch (error) {
    console.error('Error fetching credit request:', error);
    res.status(500).json({ message: 'Server error fetching credit request' });
  }
};

/**
 * Get all versions of a credit request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCreditRequestVersions = async (req, res) => {
  try {
    const requestId = req.params.id;
    
    const versions = await creditModel.getCreditRequestVersions(requestId);
    
    res.json(versions);
  } catch (err) {
    console.error('Error fetching credit request versions:', err);
    res.status(500).json({ message: 'Server error fetching credit request versions' });
  }
};

/**
 * Approve credit request (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
// backend/controllers/creditController.js - Updated approveCreditRequest function
// Updated approveCreditRequest function in creditController.js
exports.approveCreditRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { feedback } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    try {
      // 1. Get all requests related to this submission
      // This allows us to handle multi-account requests
      const requestQuery = `
        SELECT r.*, d.name as department_name 
        FROM budget_withdrawal_requests r
        JOIN budget_departments d ON r.department_id = d.id
        WHERE r.id = ? OR r.parent_request_id = ?`;
        
      const requests = await db.query(requestQuery, [requestId, requestId]);
      
      if (!requests || requests.length === 0) {
        await db.promisePool.query('ROLLBACK');
        return res.status(404).json({ message: 'Credit request not found' });
      }
      
      // Get the primary request (the one with the ID we received)
      const primaryRequest = requests.find(r => r.id == requestId) || requests[0];
      const departmentId = primaryRequest.department_id;
      const departmentName = primaryRequest.department_name;
      
      // 2. Update all requests in this submission to 'approved'
      await db.query(
        `UPDATE budget_withdrawal_requests
         SET status = 'approved', feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ? OR parent_request_id = ?`,
        [feedback, adminId, requestId, requestId]
      );
      
      // 3. Record transactions for all approved requests
      for (const request of requests) {
        await db.query(
          `INSERT INTO budget_transactions
           (request_id, key_account_id, amount, admin_id, created_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [request.id, request.key_account_id, request.amount, adminId]
        );
      }
      
      // 4. Get existing budget_master entries for this department
      const existingEntriesQuery = `
        SELECT key_account, amount 
        FROM budget_master 
        WHERE department = ?`;
      
      const existingEntries = await db.query(existingEntriesQuery, [departmentName]);
      
      // Map existing entries by key_account ID for easy lookup
      const existingMap = {};
      existingEntries.forEach(entry => {
        existingMap[entry.key_account] = entry.amount;
      });
      
      // 5. Process budget_master table updates
      // Group the requests by key_account to get the total amount per account
      const requestsByAccount = {};
      requests.forEach(req => {
        requestsByAccount[req.key_account_id] = {
          key_account_id: req.key_account_id,
          amount: (requestsByAccount[req.key_account_id]?.amount || 0) + parseFloat(req.amount)
        };
      });
      
      // For each account in the request, update or insert into budget_master
      for (const keyAccountId in requestsByAccount) {
        const newAmount = requestsByAccount[keyAccountId].amount;
        
        // Get key account details
        const [accountResult] = await db.query(
          `SELECT name, account_type FROM budget_key_accounts WHERE id = ?`, 
          [keyAccountId]
        );
        
        if (existingMap[keyAccountId] !== undefined) {
          // UPDATE existing entry
          await db.query(
            `UPDATE budget_master 
             SET amount = ? 
             WHERE key_account = ? AND department = ?`,
            [newAmount, keyAccountId, departmentName]
          );
        } else {
          // INSERT new entry
          await db.query(
            `INSERT INTO budget_master 
             (key_account, key_account_name, type, department, amount) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              keyAccountId, 
              accountResult ? accountResult.name : 'Unknown Account',
              accountResult ? accountResult.account_type : 'Expense',
              departmentName, 
              newAmount
            ]
          );
        }
        
        // Remove this key from existingMap to track which ones were processed
        delete existingMap[keyAccountId];
      }
      
      // 6. Handle accounts that were removed (any remaining in existingMap)
      // Option 1: Delete them
      for (const keyAccountId in existingMap) {
        await db.query(
          `DELETE FROM budget_master 
           WHERE key_account = ? AND department = ?`,
          [keyAccountId, departmentName]
        );
      }
      
      // Alternative option: Instead of deleting, set to zero
      // for (const keyAccountId in existingMap) {
      //   await db.query(
      //     `UPDATE budget_master 
      //      SET amount = 0 
      //      WHERE key_account = ? AND department = ?`,
      //     [keyAccountId, departmentName]
      //   );
      // }
      
      // 7. Record history for all requests
      for (const request of requests) {
        await db.query(
          `INSERT INTO budget_withdrawal_history
           (request_id, previous_status, new_status, changed_by, change_reason)
           VALUES (?, ?, 'approved', ?, ?)`,
          [request.id, request.status, adminId, feedback || 'Request approved']
        );
      }
      
      // Commit transaction
      await db.promisePool.query('COMMIT');
      
      res.json({ 
        message: `${requests.length} request(s) approved successfully`,
        updated_master: true,
        accounts_modified: requests.length,
        accounts_removed: Object.keys(existingMap).length
      });
    } catch (innerError) {
      // Rollback transaction on error
      await db.promisePool.query('ROLLBACK');
      console.error('Transaction error in approveCreditRequest:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('Error approving credit request:', error);
    res.status(500).json({ message: 'Server error approving credit request: ' + error.message });
  }
};

/**
 * Reject credit request (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.rejectCreditRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    await creditModel.rejectCreditRequest(requestId, adminId, reason);
    
    res.json({ message: 'Credit request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting credit request:', error);
    res.status(500).json({ message: 'Server error rejecting credit request' });
  }
};

/**
 * Create revision request (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createRevisionRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { feedback, suggested_amount } = req.body;
    
    if (!feedback) {
      return res.status(400).json({ message: 'Feedback is required for revision' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    try {
      // Get original request to check if it exists
      const [originalRequest] = await db.query(
        `SELECT * FROM budget_withdrawal_requests WHERE id = ?`,
        [requestId]
      );
      
      if (!originalRequest) {
        await db.promisePool.query('ROLLBACK');
        return res.status(404).json({ message: 'Credit request not found' });
      }
      
      // Update the request status to 'revision'
      await db.query(
        `UPDATE budget_withdrawal_requests
         SET status = 'revision', 
             feedback = ?, 
             reviewed_by = ?, 
             reviewed_at = CURRENT_TIMESTAMP,
             suggested_amount = ?
         WHERE id = ?`,
        [feedback, adminId, suggested_amount || null, requestId]
      );
      
      // Record history
      await db.query(
        `INSERT INTO budget_withdrawal_history
         (request_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, ?, 'revision', ?, ?)`,
        [requestId, originalRequest.status, adminId, feedback]
      );
      
      // Commit the transaction
      await db.promisePool.query('COMMIT');
      
      res.json({
        message: 'Revision requested successfully',
        requestId: requestId
      });
    } catch (innerError) {
      // Rollback on error
      await db.promisePool.query('ROLLBACK');
      console.error('Error in createRevisionRequest transaction:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('Error creating revision request:', error);
    res.status(500).json({ message: 'Server error creating revision request: ' + error.message });
  }
};

/**
 * Update revision request (user responding to admin)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateRevisionRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.id;
    const { amount, reason, key_account_id } = req.body;
    
    if (!amount || parseFloat(amount) <= 0 || !reason) {
      return res.status(400).json({ message: 'Valid amount and reason are required' });
    }
    
    const result = await creditModel.updateRevisionRequest(requestId, userId, {
      amount: parseFloat(amount),
      reason,
      key_account_id
    });
    
    res.json({
      message: 'Revision updated successfully',
      newRequestId: result.newRequestId,
      version: result.version
    });
  } catch (err) {
    console.error('Error updating revision:', err);
    res.status(500).json({ message: 'Server error updating revision' });
  }
};

/**
 * Resolve revision (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resolveRevision = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    await creditModel.resolveRevision(requestId, adminId);
    
    res.json({ message: 'Credit request resolved successfully' });
  } catch (error) {
    console.error('Error resolving credit request:', error);
    res.status(500).json({ message: 'Server error resolving credit request' });
  }
};

/**
 * Check available budget for a key account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkAvailableBudget = async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const budget = await creditModel.checkAvailableBudget(accountId);
    res.json(budget);
  } catch (error) {
    console.error('Error checking available budget:', error);
    res.status(500).json({ message: 'Server error checking available budget' });
  }
};

/**
 * Get department spending summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDepartmentSpendingSummary = async (req, res) => {
  try {
    const departmentId = req.params.departmentId;
    const summary = await creditModel.getDepartmentSpendingSummary(departmentId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching department spending summary:', error);
    res.status(500).json({ message: 'Server error fetching department spending summary' });
  }
};

/**
 * Save draft credit request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.saveDraftCreditRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { department_id, entries } = req.body;
    
    if (!department_id || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ message: 'Invalid draft data' });
    }
    
    const requestData = {
      user_id: userId,
      department_id,
      entries,
      status: 'draft'
    };
    
    const result = await creditModel.saveDraftCreditRequest(requestData);
    
    res.json({ 
      message: 'Draft saved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error saving draft credit request:', error);
    res.status(500).json({ message: 'Server error saving draft credit request' });
  }
};

/**
 * Get user draft credit requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserDraftCreditRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const drafts = await creditModel.getUserDraftCreditRequests(userId);
    res.json(drafts);
  } catch (error) {
    console.error('Error fetching draft credit requests:', error);
    res.status(500).json({ message: 'Server error fetching draft credit requests' });
  }
};

// Updated batchApproveCreditRequests function with collation fix
exports.batchApproveCreditRequests = async (req, res) => {
  try {
    const { requestIds, feedback } = req.body;
    const adminId = req.user.id;
    
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ message: 'Request IDs array is required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    // Begin transaction for the entire batch
    await db.promisePool.query('START TRANSACTION');
    
    try {
      // Process each request
      const results = await Promise.all(
        requestIds.map(async (id) => {
          try {
            // 1. Get request details
            const [request] = await db.query(
              `SELECT * FROM budget_withdrawal_requests WHERE id = ?`,
              [id]
            );
            
            if (!request) {
              return { id, success: false, error: 'Request not found' };
            }
            
            // 2. Update request status
            await db.query(
              `UPDATE budget_withdrawal_requests
               SET status = 'approved', feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [feedback, adminId, id]
            );
            
            // 3. Record transaction with the correct column name (created_at)
            await db.query(
              `INSERT INTO budget_transactions
               (request_id, key_account_id, amount, admin_id, created_at)
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [id, request.key_account_id, request.amount, adminId]
            );
            
            // 4. Get department name directly first to avoid collation issues
            const [deptResult] = await db.query(
              `SELECT name FROM budget_departments WHERE id = ?`, 
              [request.department_id]
            );
            
            const departmentName = deptResult ? deptResult.name : null;
            
            // 5. Check if entry exists in budget_master using direct comparison with collation
            const checkMasterQuery = `
              SELECT * FROM budget_master 
              WHERE key_account = ? 
              AND department = ? COLLATE utf8mb4_unicode_ci`;
            
            const masterEntries = await db.query(checkMasterQuery, [
              request.key_account_id, 
              departmentName
            ]);
            
            // 6. Get key account details
            const [accountResult] = await db.query(
              `SELECT name, account_type FROM budget_key_accounts WHERE id = ?`, 
              [request.key_account_id]
            );
            
// Key change: replacement instead of addition
            if (masterEntries && masterEntries.length > 0) {
              // Entry exists, REPLACE instead of adding to the amount
              await db.query(
                `UPDATE budget_master 
                SET amount = ? 
                WHERE key_account = ? 
                AND department = ?`,
                [request.amount, request.key_account_id, departmentName]
              );
            } else if (departmentName) {
              // Entry doesn't exist, create it
              await db.query(
                `INSERT INTO budget_master 
                 (key_account, key_account_name, type, department, amount) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                  request.key_account_id, 
                  accountResult ? accountResult.name : 'Unknown Account',
                  accountResult ? accountResult.account_type : 'Expense',
                  departmentName, 
                  request.amount
                ]
              );
            }
            
            // 7. Record history
            await db.query(
              `INSERT INTO budget_withdrawal_history
               (request_id, previous_status, new_status, changed_by, change_reason)
               VALUES (?, ?, 'approved', ?, ?)`,
              [id, request.status, adminId, feedback || 'Request approved']
            );
            
            return { id, success: true };
          } catch (err) {
            console.error(`Error processing request ${id}:`, err);
            return { id, success: false, error: err.message };
          }
        })
      );
      
      // Commit transaction if we got here
      await db.promisePool.query('COMMIT');
      
      const successCount = results.filter(result => result.success).length;
      
      res.json({
        message: `${successCount} out of ${requestIds.length} requests approved successfully`,
        results,
        updated_master: true
      });
    } catch (batchError) {
      // Rollback the entire batch on error
      await db.promisePool.query('ROLLBACK');
      console.error('Error in batch approve transaction:', batchError);
      throw batchError;
    }
  } catch (error) {
    console.error('Error in batch approve:', error);
    res.status(500).json({ message: 'Server error during batch approval: ' + error.message });
  }
};

/**
 * Get user draft credit requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */

// backend/controllers/creditController.js - Updated batchApproveCreditRequests function
// Updated approveCreditRequest function with collation fix
exports.approveCreditRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { feedback } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    try {
      // 1. Get request details
      const requestQuery = `
        SELECT * FROM budget_withdrawal_requests 
        WHERE id = ?`;
      const [request] = await db.query(requestQuery, [requestId]);
      
      if (!request) {
        await db.promisePool.query('ROLLBACK');
        return res.status(404).json({ message: 'Credit request not found' });
      }
      
      // 2. Update request status
      await db.query(
        `UPDATE budget_withdrawal_requests
         SET status = 'approved', feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [feedback, adminId, requestId]
      );
      
      // 3. Record transaction with the correct column name (created_at)
      await db.query(
        `INSERT INTO budget_transactions
         (request_id, key_account_id, amount, admin_id, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [requestId, request.key_account_id, request.amount, adminId]
      );
      
      // 4. Get department name directly first to avoid collation issues
      const [deptResult] = await db.query(
        `SELECT name FROM budget_departments WHERE id = ?`, 
        [request.department_id]
      );
      
      const departmentName = deptResult ? deptResult.name : null;
      
      // 5. Check if entry exists in budget_master using direct comparison
      // with explicit collation to avoid collation mismatch
      const checkMasterQuery = `
        SELECT * FROM budget_master 
        WHERE key_account = ? 
        AND department = ? COLLATE utf8mb4_unicode_ci`;
      
      const masterEntries = await db.query(checkMasterQuery, [
        request.key_account_id, 
        departmentName
      ]);
      
      // 6. Get key account details
      const [accountResult] = await db.query(
        `SELECT name, account_type FROM budget_key_accounts WHERE id = ?`, 
        [request.key_account_id]
      );
      
      if (masterEntries && masterEntries.length > 0) {
        // Entry exists, update it
        await db.query(
          `UPDATE budget_master 
           SET amount = ? 
           WHERE key_account = ? 
           AND department = ?`,
          [request.amount, request.key_account_id, departmentName]
        );
      } else if (departmentName) {
        // Entry doesn't exist, create it
        await db.query(
          `INSERT INTO budget_master 
           (key_account, key_account_name, type, department, amount) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            request.key_account_id, 
            accountResult ? accountResult.name : 'Unknown Account',
            accountResult ? accountResult.account_type : 'Expense',
            departmentName, 
            request.amount
          ]
        );
      }
      
      // 7. Record history
      await db.query(
        `INSERT INTO budget_withdrawal_history
         (request_id, previous_status, new_status, changed_by, change_reason)
         VALUES (?, ?, 'approved', ?, ?)`,
        [requestId, request.status, adminId, feedback || 'Request approved']
      );
      
      // Commit transaction
      await db.promisePool.query('COMMIT');
      
      res.json({ 
        message: 'Credit request approved successfully',
        updated_master: true
      });
    } catch (innerError) {
      // Rollback transaction on error
      await db.promisePool.query('ROLLBACK');
      console.error('Transaction error in approveCreditRequest:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('Error approving credit request:', error);
    res.status(500).json({ message: 'Server error approving credit request: ' + error.message });
  }
};

/**
 * Batch reject multiple credit requests (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.batchRejectCreditRequests = async (req, res) => {
  try {
    const { requestIds, reason } = req.body;
    const adminId = req.user.id;
    
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ message: 'Request IDs array is required' });
    }
    
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    const results = await Promise.all(
      requestIds.map(async (id) => {
        try {
          await creditModel.rejectCreditRequest(id, adminId, reason);
          return { id, success: true };
        } catch (err) {
          return { id, success: false, error: err.message };
        }
      })
    );
    
    const successCount = results.filter(result => result.success).length;
    
    res.json({
      message: `${successCount} out of ${requestIds.length} requests rejected successfully`,
      results
    });
  } catch (error) {
    console.error('Error in batch reject:', error);
    res.status(500).json({ message: 'Server error during batch rejection' });
  }
};

/**
 * Batch create revision requests (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.batchCreateRevisionRequests = async (req, res) => {
  try {
    const { requestIds, feedback, suggestedAmount } = req.body;
    const adminId = req.user.id;
    
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ message: 'Request IDs array is required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    const results = await Promise.all(
      requestIds.map(async (id) => {
        try {
          // If individual amount adjustments are provided, use them
          const amount = suggestedAmount && typeof suggestedAmount === 'object' 
            ? suggestedAmount[id] 
            : suggestedAmount;
          
          const result = await creditModel.createRevisionRequest(
            id, adminId, feedback, amount
          );
          return { id, success: true, requestId: result.requestId };
        } catch (err) {
          return { id, success: false, error: err.message };
        }
      })
    );
    
    const successCount = results.filter(result => result.success).length;
    
    res.json({
      message: `${successCount} out of ${requestIds.length} revision requests created successfully`,
      results
    });
  } catch (error) {
    console.error('Error in batch revision creation:', error);
    res.status(500).json({ message: 'Server error during batch revision creation' });
  }
};

/**
 * Batch update multiple revision requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.batchUpdateRevisions = async (req, res) => {
  try {
    const { revisions } = req.body;
    const userId = req.user.id;
    
    if (!revisions || !Array.isArray(revisions) || revisions.length === 0) {
      return res.status(400).json({ message: 'Revision array is required' });
    }
    
    const results = await Promise.all(
      revisions.map(async (revision) => {
        try {
          if (!revision.id || !revision.amount || !revision.reason) {
            return { 
              id: revision.id || 'unknown', 
              success: false, 
              error: 'Missing required fields (id, amount, reason)' 
            };
          }
          
          const result = await creditModel.updateRevisionRequest(
            revision.id, 
            userId, 
            {
              amount: parseFloat(revision.amount),
              reason: revision.reason,
              key_account_id: revision.key_account_id
            }
          );
          
          return { 
            id: revision.id, 
            success: true, 
            newRequestId: result.newRequestId,
            version: result.version
          };
        } catch (err) {
          return { id: revision.id, success: false, error: err.message };
        }
      })
    );
    
    const successCount = results.filter(result => result.success).length;
    
    res.json({
      message: `${successCount} out of ${revisions.length} revisions updated successfully`,
      results
    });
  } catch (error) {
    console.error('Error in batch update revisions:', error);
    res.status(500).json({ message: 'Server error during batch revision update' });
  }
};


module.exports = exports;