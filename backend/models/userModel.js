// backend/models/userModel.js
const db = require('../config/db');

/**
 * Find user by email
 * @param {String} email - User email
 * @param {Function} callback - Callback function
 */
exports.findUserByEmail = (email, callback) => {
  const query = 'SELECT * FROM budget_users WHERE email = ? LIMIT 1';
  
  db.query(query, [email])
    .then(results => {
      callback(null, results[0]);
    })
    .catch(error => {
      console.error('DB Error in findUserByEmail:', error);
      callback(error, null);
    });
};

/**
 * Find user by ID
 * @param {Number} id - User ID
 * @param {Function} callback - Callback function
 */
exports.findUserById = (id, callback) => {
  const query = 'SELECT * FROM budget_users WHERE id = ? LIMIT 1';
  
  db.query(query, [id])
    .then(results => {
      callback(null, results[0]);
    })
    .catch(error => {
      console.error('DB Error in findUserById:', error);
      callback(error, null);
    });
};

/**
 * Find pending registration by email
 * @param {String} email - User email
 * @param {Function} callback - Callback function
 */
exports.findPendingByEmail = (email, callback) => {
  const query = 'SELECT * FROM budget_pending_users WHERE email = ? LIMIT 1';
  
  db.query(query, [email])
    .then(results => {
      callback(null, results[0]);
    })
    .catch(error => {
      console.error('DB Error in findPendingByEmail:', error);
      callback(error, null);
    });
};

/**
 * Create pending registration
 * @param {Object} userData - User data
 * @param {Function} callback - Callback function
 */
// backend/models/userModel.js
exports.createPending = (userData, callback) => {
  const {
    name,
    surname,
    employeeId,
    email,
    role,
    department,    // ← string
    passwordHash,
    otp,
    otp_expiry
  } = userData;

  const query = `
    INSERT INTO budget_pending_users 
      (name, surname, employee_id, email, password, role, department, otp, otp_expiry)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [
    name,
    surname,
    employeeId,
    email,
    passwordHash,
    role,
    department,   // ← stores the name
    otp,
    otp_expiry
  ])
    .then(() => callback(null))
    .catch(err => {
      console.error('DB Error in createPending:', err);
      callback(err);
    });
};


/**
 * Delete pending registration
 * @param {String} email - User email
 * @param {Function} callback - Callback function
 */
exports.deletePending = (email, callback) => {
  const query = 'DELETE FROM budget_pending_users WHERE email = ?';
  
  db.query(query, [email])
    .then(() => {
      callback(null);
    })
    .catch(error => {
      console.error('DB Error in deletePending:', error);
      callback(error);
    });
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @param {Function} callback - Callback function
 */
// backend/models/userModel.js
exports.createUser = (userData, callback) => {
  const {
    name,
    surname,
    employeeId,
    email,
    role,
    department,   // ← the string name
    passwordHash
  } = userData;

  const query = `
    INSERT INTO budget_users
      (name, surname, employee_id, email, password, role, department)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [
    name,
    surname,
    employeeId,
    email,
    passwordHash,
    role,
    department    // ← stores the name
  ])
    .then(() => callback(null))
    .catch(err => {
      console.error('DB Error in createUser:', err);
      callback(err);
    });
};


/**
 * Get all users
 * @returns {Promise} Promise with users data
 */
exports.getAllUsers = () => {
  const query = `
    SELECT u.*, GROUP_CONCAT(d.name) as departments
    FROM budget_users u
    LEFT JOIN budget_department_users du ON u.id = du.user_id
    LEFT JOIN budget_departments d ON du.department_id = d.id
    GROUP BY u.id
  `;
  
  return db.query(query);
};

/**
 * Get user departments
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with departments data
 */
exports.getUserDepartments = (userId) => {
  const query = `
    SELECT d.*
    FROM budget_departments d
    JOIN budget_department_users du ON d.id = du.department_id
    WHERE du.user_id = ?
  `;
  
  return db.query(query, [userId]);
};

/**
 * Update user
 * @param {Number} userId - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise} Promise with update result
 */
exports.updateUser = (userId, userData) => {
  const { name, surname, email, role } = userData;
  
  const query = `
    UPDATE budget_users
    SET name = ?, surname = ?, email = ?, role = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  return db.query(query, [name, surname, email, role, userId]);
};

/**
 * Delete user
 * @param {Number} userId - User ID
 * @returns {Promise} Promise with delete result
 */
exports.deleteUser = (userId) => {
  const query = 'DELETE FROM budget_users WHERE id = ?';
  
  return db.query(query, [userId]);
};