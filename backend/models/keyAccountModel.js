// backend/models/keyAccountModel.js
const db = require('../config/db');

/**
 * Get all key accounts
 * @returns {Promise} Promise with key accounts data
 */
exports.getAllKeyAccounts = () => {
  const query = 'SELECT * FROM budget_key_accounts ORDER BY id';
  return db.query(query);
};

/**
 * Get key account by ID
 * @param {String} id - Key Account ID
 * @returns {Promise} Promise with key account data
 */
exports.getKeyAccountById = (id) => {
  const query = 'SELECT * FROM budget_key_accounts WHERE id = ?';
  return db.query(query, [id]);
};

/**
 * Create or update key account
 * @param {Object} accountData - Key account data
 * @returns {Promise} Promise with result
 */
exports.upsertKeyAccount = async (accountData) => {
  const { id, name, account_type, total_budget } = accountData;
  
  // Check if key account exists
  const existing = await db.query('SELECT * FROM budget_key_accounts WHERE id = ?', [id]);
  
  if (existing && existing.length > 0) {
    // Update existing account
    const query = `
      UPDATE budget_key_accounts 
      SET name = ?, account_type = ?, total_budget = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    return db.query(query, [name, account_type, total_budget, id]);
  } else {
    // Create new account
    const query = `
      INSERT INTO budget_key_accounts (id, name, account_type, total_budget)
      VALUES (?, ?, ?, ?)
    `;
    return db.query(query, [id, name, account_type, total_budget]);
  }
};

/**
 * Get total budget allocated across all key accounts
 * @returns {Promise} Promise with total budget data
 */
exports.getTotalBudget = async () => {
  const query = `
    SELECT SUM(total_budget) as total_allocated, 
           SUM(used_amount) as total_used 
    FROM budget_key_accounts
  `;
  const result = await db.query(query);
  return result[0];
};

/**
 * Get key accounts with usage data
 * @returns {Promise} Promise with key accounts and usage data
 */
exports.getKeyAccountsWithUsage = async () => {
  const query = `
    SELECT id, name, account_type, total_budget, used_amount,
           (total_budget - used_amount) as available_amount,
           CASE 
             WHEN total_budget > 0 THEN (used_amount / total_budget) * 100
             ELSE 0
           END as usage_percentage
    FROM budget_key_accounts
    ORDER BY account_type, id
  `;
  return db.query(query);
};

/**
 * Update used amount for a key account
 * @param {String} accountId - Key Account ID
 * @param {Number} amount - Amount to add to used amount (can be negative)
 * @returns {Promise} Promise with update result
 */
exports.updateUsedAmount = async (accountId, amount) => {
  const query = `
    UPDATE budget_key_accounts
    SET used_amount = used_amount + ?
    WHERE id = ?
  `;
  return db.query(query, [amount, accountId]);
};

/**
 * Get department-wise spending for a key account
 * @param {String} accountId - Key Account ID
 * @returns {Promise} Promise with department spending data
 */
exports.getDepartmentSpendingByAccount = async (accountId) => {
  const query = `
    SELECT d.id, d.name as department_name, 
           COALESCE(SUM(wr.amount), 0) as total_spent
    FROM budget_departments d
    LEFT JOIN budget_withdrawal_requests wr ON d.id = wr.department_id 
                                           AND wr.key_account_id = ?
                                           AND wr.status = 'approved'
    GROUP BY d.id, d.name
    ORDER BY total_spent DESC
  `;
  return db.query(query, [accountId]);
};

/**
 * Get account-wise spending for a department
 * @param {Number} departmentId - Department ID
 * @returns {Promise} Promise with account spending data
 */
exports.getAccountSpendingByDepartment = async (departmentId) => {
  const query = `
    SELECT ka.id, ka.name as account_name, ka.account_type,
           COALESCE(SUM(wr.amount), 0) as total_spent,
           ka.total_budget,
           ka.used_amount
    FROM budget_key_accounts ka
    LEFT JOIN budget_withdrawal_requests wr ON ka.id = wr.key_account_id 
                                           AND wr.department_id = ?
                                           AND wr.status = 'approved'
    GROUP BY ka.id, ka.name, ka.account_type, ka.total_budget, ka.used_amount
    ORDER BY ka.account_type, ka.id
  `;
  return db.query(query, [departmentId]);
};