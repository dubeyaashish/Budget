// backend/models/keyAccountModel.js
const db = require('../config/db');

exports.getAllKeyAccounts = async () => {
  try {
    const rows = await db.query(`
      SELECT * 
      FROM budget_key_accounts
      ORDER BY name ASC
    `);
    return rows;
  } catch (error) {
    console.error('Error fetching key accounts:', error);
    throw error;
  }
};

exports.getKeyAccountById = async (id) => {
  try {
    const rows = await db.query(`
      SELECT * 
      FROM budget_key_accounts
      WHERE id = ?
    `, [id]);
    
    return rows[0];
  } catch (error) {
    console.error('Error fetching key account:', error);
    throw error;
  }
};

exports.getKeyAccountWithUsage = async (id) => {
  try {
    // Get the account and its total budget
    const accounts = await db.query(`
      SELECT *
      FROM budget_key_accounts
      WHERE id = ?
    `, [id]);
    
    if (accounts.length === 0) {
      return null;
    }
    
    const account = accounts[0];
    
    // Calculate the used amount from transactions
    const usageResults = await db.query(`
      SELECT SUM(amount) as used_amount
      FROM budget_transactions
      WHERE key_account_id = ?
    `, [id]);
    
    const usedAmount = usageResults[0].used_amount || 0;
    const availableAmount = account.total_budget - usedAmount;
    
    return {
      ...account,
      used_amount: usedAmount,
      available_amount: availableAmount,
      usage_percentage: account.total_budget > 0 ? (usedAmount / account.total_budget) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching key account with usage:', error);
    throw error;
  }
};

exports.getKeyAccountsWithUsage = async () => {
  try {
    // Get all accounts
    const accounts = await db.query(`
      SELECT *
      FROM budget_key_accounts
      ORDER BY name ASC
    `);
    
    // Get usage data for all accounts
    const usageResults = await db.query(`
      SELECT key_account_id, SUM(amount) as used_amount
      FROM budget_transactions
      GROUP BY key_account_id
    `);
    
    // Create a map of account ID to used amount
    const usageMap = {};
    usageResults.forEach(result => {
      usageMap[result.key_account_id] = result.used_amount || 0;
    });
    
    // Combine accounts with their usage data
    const accountsWithUsage = accounts.map(account => {
      const usedAmount = usageMap[account.id] || 0;
      const availableAmount = account.total_budget - usedAmount;
      
      return {
        ...account,
        used_amount: usedAmount,
        available_amount: availableAmount,
        usage_percentage: account.total_budget > 0 ? (usedAmount / account.total_budget) * 100 : 0
      };
    });
    
    return accountsWithUsage;
  } catch (error) {
    console.error('Error fetching key accounts with usage:', error);
    throw error;
  }
};

exports.upsertKeyAccount = async (accountData) => {
  try {
    // Begin transaction
    await db.promisePool.query('START TRANSACTION');
    
    // Check if the account exists
    const existingAccounts = await db.query(
      `SELECT * FROM budget_key_accounts WHERE id = ?`,
      [accountData.id]
    );
    
    if (existingAccounts.length > 0) {
      // Update existing account
      await db.query(
        `UPDATE budget_key_accounts
         SET name = ?, account_type = ?, total_budget = ?
         WHERE id = ?`,
        [accountData.name, accountData.account_type, accountData.total_budget, accountData.id]
      );
    } else {
      // Insert new account
      await db.query(
        `INSERT INTO budget_key_accounts (id, name, account_type, total_budget)
         VALUES (?, ?, ?, ?)`,
        [accountData.id, accountData.name, accountData.account_type, accountData.total_budget]
      );
    }
    
    await db.promisePool.query('COMMIT');
    return { success: true };
  } catch (error) {
    await db.promisePool.query('ROLLBACK');
    console.error('Error upserting key account:', error);
    throw error;
  }
};

exports.getAccountSpendingByDepartment = async (departmentId) => {
  try {
    const rows = await db.query(`
      SELECT 
        ka.id, 
        ka.name as account_name, 
        ka.account_type, 
        ka.total_budget,
        COALESCE(SUM(t.amount), 0) as total_spent
      FROM budget_key_accounts ka
      LEFT JOIN budget_transactions t ON ka.id = t.key_account_id
      LEFT JOIN budget_withdrawal_requests r ON t.request_id = r.id AND r.department_id = ?
      GROUP BY ka.id
      ORDER BY ka.account_type, ka.name
    `, [departmentId]);
    
    return rows.map(row => ({
      ...row,
      total_spent: row.total_spent || 0
    }));
  } catch (error) {
    console.error('Error fetching account spending by department:', error);
    throw error;
  }
};

exports.getDepartmentSpendingByAccount = async (accountId) => {
  try {
    const rows = await db.query(`
      SELECT 
        d.id as department_id, 
        d.name as department_name,
        COALESCE(SUM(t.amount), 0) as total_spent
      FROM budget_departments d
      LEFT JOIN budget_withdrawal_requests r ON d.id = r.department_id
      LEFT JOIN budget_transactions t ON r.id = t.request_id AND t.key_account_id = ?
      GROUP BY d.id
      ORDER BY total_spent DESC
    `, [accountId]);
    
    return rows;
  } catch (error) {
    console.error('Error fetching department spending by account:', error);
    throw error;
  }
};

exports.getBudgetSummary = async () => {
  try {
    // Get total allocated budget
    const totalBudgetResult = await db.query(`
      SELECT SUM(total_budget) as total_allocated
      FROM budget_key_accounts
    `);
    
    // Get total used budget
    const totalUsedResult = await db.query(`
      SELECT SUM(amount) as total_used
      FROM budget_transactions
    `);
    
    const totalAllocated = totalBudgetResult[0]?.total_allocated || 0;
    const totalUsed = totalUsedResult[0]?.total_used || 0;
    
    return {
      total_allocated: totalAllocated,
      total_used: totalUsed,
      total_available: totalAllocated - totalUsed,
      usage_percentage: totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    throw error;
  }
};