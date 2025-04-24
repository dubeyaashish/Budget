// backend/controllers/keyAccountController.js
const keyAccountModel = require('../models/keyAccountModel');

/**
 * Get all key accounts
 * GET /api/key-accounts
 */
exports.getAllKeyAccounts = async (req, res) => {
  try {
    const accounts = await keyAccountModel.getAllKeyAccounts();
    res.json(accounts);
  } catch (error) {
    console.error('Error getting key accounts:', error);
    res.status(500).json({ message: 'Server error fetching key accounts.' });
  }
};

/**
 * Get key account by ID
 * GET /api/key-accounts/:id
 */
exports.getKeyAccountById = async (req, res) => {
  try {
    const id = req.params.id;
    const account = await keyAccountModel.getKeyAccountById(id);
    
    if (!account || account.length === 0) {
      return res.status(404).json({ message: 'Key account not found.' });
    }
    
    res.json(account[0]);
  } catch (error) {
    console.error('Error getting key account:', error);
    res.status(500).json({ message: 'Server error fetching key account.' });
  }
};

/**
 * Create or update key account
 * POST /api/key-accounts
 */
exports.upsertKeyAccount = async (req, res) => {
  try {
    const { id, name, account_type, total_budget } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ message: 'Account ID and name are required.' });
    }
    
    await keyAccountModel.upsertKeyAccount({
      id,
      name,
      account_type,
      total_budget: parseFloat(total_budget) || 0
    });
    
    res.status(200).json({ 
      message: 'Key account saved successfully',
      id
    });
  } catch (error) {
    console.error('Error saving key account:', error);
    res.status(500).json({ message: 'Server error saving key account.' });
  }
};

/**
 * Get key accounts with usage data
 * GET /api/key-accounts/usage
 */
exports.getKeyAccountsWithUsage = async (req, res) => {
  try {
    const accountsWithUsage = await keyAccountModel.getKeyAccountsWithUsage();
    res.json(accountsWithUsage);
  } catch (error) {
    console.error('Error getting key accounts usage:', error);
    res.status(500).json({ message: 'Server error fetching key accounts usage.' });
  }
};

/**
 * Get department-wise spending for a key account
 * GET /api/key-accounts/:id/departments
 */
exports.getDepartmentSpendingByAccount = async (req, res) => {
  try {
    const id = req.params.id;
    const departmentSpending = await keyAccountModel.getDepartmentSpendingByAccount(id);
    res.json(departmentSpending);
  } catch (error) {
    console.error('Error getting department spending:', error);
    res.status(500).json({ message: 'Server error fetching department spending data.' });
  }
};

/**
 * Get account-wise spending for a department
 * GET /api/key-accounts/departments/:departmentId
 */
exports.getAccountSpendingByDepartment = async (req, res) => {
  try {
    const departmentId = req.params.departmentId;
    const accountSpending = await keyAccountModel.getAccountSpendingByDepartment(departmentId);
    res.json(accountSpending);
  } catch (error) {
    console.error('Error getting account spending by department:', error);
    res.status(500).json({ message: 'Server error fetching account spending data.' });
  }
};

/**
 * Get total budget summary
 * GET /api/key-accounts/summary
 */
exports.getBudgetSummary = async (req, res) => {
  try {
    const summary = await keyAccountModel.getTotalBudget();
    res.json(summary);
  } catch (error) {
    console.error('Error getting budget summary:', error);
    res.status(500).json({ message: 'Server error fetching budget summary.' });
  }
};