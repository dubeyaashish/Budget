const db = require('../config/db');

/**
 * Get all departments
 * @returns {Promise} Promise with departments data
 */
exports.getAllDepartments = () => {
  const query = 'SELECT * FROM budget_departments ORDER BY name';
  return db.query(query);
};

/**
 * Get department by ID
 * @param {Number} id - Department ID
 * @returns {Promise} Promise with department data
 */
exports.getDepartmentById = (id) => {
  const query = 'SELECT * FROM budget_departments WHERE id = ?';
  return db.query(query, [id]);
};

/**
 * Create department
 * @param {Object} departmentData - Department data
 * @returns {Promise} Promise with insert result
 */
exports.createDepartment = (departmentData) => {
  const { name, description } = departmentData;
  const query = 'INSERT INTO budget_departments (name, description) VALUES (?, ?)';
  return db.query(query, [name, description]);
};

/**
 * Update department
 * @param {Number} id - Department ID
 * @param {Object} departmentData - Department data
 * @returns {Promise} Promise with update result
 */
exports.updateDepartment = (id, departmentData) => {
  const { name, description } = departmentData;
  const query = 'UPDATE budget_departments SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  return db.query(query, [name, description, id]);
};

/**
 * Delete department
 * @param {Number} id - Department ID
 * @returns {Promise} Promise with delete result
 */
exports.deleteDepartment = (id) => {
  const query = 'DELETE FROM budget_departments WHERE id = ?';
  return db.query(query, [id]);
};

// backend/models/categoryModel.js
const db = require('../config/db');

/**
 * Get all categories
 * @returns {Promise} Promise with categories data
 */
exports.getAllCategories = () => {
  const query = 'SELECT * FROM budget_categories ORDER BY name';
  return db.query(query);
};

/**
 * Get category by ID
 * @param {Number} id - Category ID
 * @returns {Promise} Promise with category data
 */
exports.getCategoryById = (id) => {
  const query = 'SELECT * FROM budget_categories WHERE id = ?';
  return db.query(query, [id]);
};

/**
 * Create category
 * @param {Object} categoryData - Category data
 * @returns {Promise} Promise with insert result
 */
exports.createCategory = (categoryData) => {
  const { name, description } = categoryData;
  const query = 'INSERT INTO budget_categories (name, description) VALUES (?, ?)';
  return db.query(query, [name, description]);
};

/**
 * Update category
 * @param {Number} id - Category ID
 * @param {Object} categoryData - Category data
 * @returns {Promise} Promise with update result
 */
exports.updateCategory = (id, categoryData) => {
  const { name, description } = categoryData;
  const query = 'UPDATE budget_categories SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  return db.query(query, [name, description, id]);
};

/**
 * Delete category
 * @param {Number} id - Category ID
 * @returns {Promise} Promise with delete result
 */
exports.deleteCategory = (id) => {
  const query = 'DELETE FROM budget_categories WHERE id = ?';
  return db.query(query, [id]);
};