const creditModel = require('../models/creditModel');
const keyAccountModel = require('../models/keyAccountModel');

/**
 * Get budget master data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * Get budget master data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBudgetMasterData = async (req, res) => {
  try {
    // Query directly to ensure we're getting the expected data
    const query = `
      SELECT *
      FROM budget_master
      ORDER BY department, type, key_account
    `;
    
    // Use db.query directly to avoid any potential issues with model methods
    const [rows] = await db.promisePool.query(query);
    
    console.log('Budget Master Data results:', JSON.stringify(rows, null, 2).substring(0, 500) + '...');
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching budget master data:', error);
    res.status(500).json({ message: 'Server error fetching budget data' });
  }
};

/**
 * Get department budget master data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDepartmentBudgetMasterData = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    console.log(`Fetching budget master data for department ID: ${departmentId}`);
    
    // Query directly with both string and number comparison to handle potential type mismatches
    const query = `
      SELECT *
      FROM budget_master
      WHERE department = ? OR department = ?
      ORDER BY type, key_account
    `;
    
    // Use db.query directly to avoid any potential issues with model methods
    const [rows] = await db.promisePool.query(query, [departmentId, Number(departmentId)]);
    
    console.log(`Found ${rows.length} records for department ID: ${departmentId}`);
    if (rows.length === 0) {
      console.log('No data found. Dumping the first few records from budget_master:');
      const [allRows] = await db.promisePool.query('SELECT * FROM budget_master LIMIT 5');
      console.log(JSON.stringify(allRows, null, 2));
    }
    
    res.json(rows);
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
    const { department_id, key_account_id, amount, reason } = req.body;

    if (!department_id || !key_account_id || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    const requestData = {
      user_id: userId,
      department_id,
      key_account_id,
      amount: parseFloat(amount),
      reason,
      version: 1,
      status: 'pending',
      parent_request_id: null
    };

    const { insertId } = await creditModel.createCreditRequest(requestData);

    res.status(201).json({
      message: 'Credit request created successfully',
      requestId: insertId
    });
  } catch (error) {
    console.error('Error creating credit request:', error);
    res.status(500).json({ message: 'Server error creating credit request' });
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
 * Get all user credit requests
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
 * Approve credit request (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.approveCreditRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    await creditModel.approveCreditRequest(requestId, adminId);
    
    res.json({ message: 'Credit request approved successfully' });
  } catch (error) {
    console.error('Error approving credit request:', error);
    res.status(500).json({ message: 'Server error approving credit request' });
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
 * Create revision version of credit request (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createRevisionVersion = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { feedback, amount } = req.body;
    
    if (!feedback || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Feedback and valid amount are required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    const result = await creditModel.createRevisionVersion(requestId, adminId, feedback, parseFloat(amount));
    
    res.json({
      message: 'Revision version created successfully',
      revisionId: result.insertId
    });
  } catch (error) {
    console.error('Error creating revision version:', error);
    res.status(500).json({ message: 'Server error creating revision version' });
  }
};

/**
 * Update revision version
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateRevisionVersion = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.id;
    const { amount, reason, key_account_id } = req.body;
    
    if (!amount || amount <= 0 || !reason || !key_account_id) {
      return res.status(400).json({ message: 'Amount, reason, and key account ID are required' });
    }
    
    const updateData = {
      amount: parseFloat(amount),
      reason,
      key_account_id
    };
    
    await creditModel.updateRevisionVersion(requestId, userId, updateData);
    
    res.json({ message: 'Revision updated successfully' });
  } catch (error) {
    console.error('Error updating revision:', error);
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
    
    await creditModel.saveDraftCreditRequest(requestData);
    
    res.json({ message: 'Draft saved successfully' });
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

// Add missing function for createRevisionRequest that was causing errors
/**
 * Create revision request (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createRevisionRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { feedback } = req.body;
    
    if (!feedback) {
      return res.status(400).json({ message: 'Feedback is required for revision' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    // Check if the model function exists, otherwise use a simple implementation
    if (typeof creditModel.createRevisionRequest === 'function') {
      const result = await creditModel.createRevisionRequest(requestId, adminId, feedback);
      res.json({
        message: 'Revision created successfully',
        revisionId: result.revisionId
      });
    } else {
      // Simplified fallback
      await creditModel.query(
        `UPDATE budget_withdrawal_requests
         SET status = 'revision', feedback = ?, reviewed_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [feedback, adminId, requestId]
      );
      res.json({ message: 'Revision created successfully' });
    }
  } catch (error) {
    console.error('Error creating revision request:', error);
    res.status(500).json({ message: 'Server error creating revision request' });
  }
};

/**
 * Update revision request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateRevisionRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.user.id;
    const { entries } = req.body;
    
    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ message: 'Valid entries are required' });
    }
    
    // Check if we have a proper model function, otherwise implement directly
    if (typeof creditModel.updateRevisionRequest === 'function') {
      await creditModel.updateRevisionRequest({
        request_id: requestId,
        user_id: userId,
        entries
      });
    } else {
      // Simplified fallback
      for (const entry of entries) {
        await creditModel.query(
          `UPDATE budget_withdrawal_requests
           SET amount = ?, reason = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND user_id = ?`,
          [entry.amount, entry.reason, entry.id, userId]
        );
      }
    }
    
    res.json({ message: 'Revision updated successfully' });
  } catch (error) {
    console.error('Error updating revision:', error);
    res.status(500).json({ message: 'Server error updating revision' });
  }
};

module.exports = exports;