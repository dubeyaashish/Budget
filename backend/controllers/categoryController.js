const categoryModel = require('../models/categoryModel');

/**
 * Get all categories
 * GET /api/categories
 */
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await categoryModel.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: 'Server error fetching categories.' });
  }
};

/**
 * Get category by ID
 * GET /api/categories/:id
 */
exports.getCategoryById = async (req, res) => {
  try {
    const id = req.params.id;
    const category = await categoryModel.getCategoryById(id);
    
    if (!category || category.length === 0) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    
    res.json(category[0]);
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({ message: 'Server error fetching category.' });
  }
};

/**
 * Create new category
 * POST /api/categories
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }
    
    const result = await categoryModel.createCategory({ name, description });
    res.status(201).json({ 
      message: 'Category created successfully',
      categoryId: result.insertId
    });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category with this name already exists.' });
    }
    res.status(500).json({ message: 'Server error creating category.' });
  }
};

/**
 * Update category
 * PUT /api/categories/:id
 */
exports.updateCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }
    
    const category = await categoryModel.getCategoryById(id);
    if (!category || category.length === 0) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    
    await categoryModel.updateCategory(id, { name, description });
    res.json({ message: 'Category updated successfully.' });
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category with this name already exists.' });
    }
    res.status(500).json({ message: 'Server error updating category.' });
  }
};

/**
 * Delete category
 * DELETE /api/categories/:id
 */
exports.deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    
    const category = await categoryModel.getCategoryById(id);
    if (!category || category.length === 0) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    
    await categoryModel.deleteCategory(id);
    res.json({ message: 'Category deleted successfully.' });
} catch (error) {
    console.error('Error deleting category:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ 
        message: 'Cannot delete category. It is referenced by budget limits.' 
      });
    }
    res.status(500).json({ message: 'Server error deleting category.' });
  }
};