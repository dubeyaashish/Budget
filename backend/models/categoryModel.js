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