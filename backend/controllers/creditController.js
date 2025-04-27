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
      if (!entry.key_account_id || !entry.amount || !entry.reason || entry.amount <= 0) {
        return res.status(400).json({ 
          message: 'Each entry must have a key account, valid amount, and reason'
        });
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
exports.approveCreditRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const adminId = req.user.id;
    const { feedback } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    
    await creditModel.approveCreditRequest(requestId, adminId, feedback);
    
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
    
    const result = await creditModel.createRevisionRequest(
      requestId, 
      adminId, 
      feedback, 
      suggested_amount
    );
    
    res.json({
      message: 'Revision requested successfully',
      requestId: result.requestId
    });
  } catch (err) {
    console.error('Error creating revision request:', err);
    res.status(500).json({ message: 'Server error creating revision request' });
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


module.exports = exports;