import api from './api';

const budgetService = {
  // Get all budget limits
  getAllBudgetLimits: async () => {
    try {
      const response = await api.get('/budgets');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get budget limits by department
  getBudgetLimitsByDepartment: async (departmentId) => {
    try {
      const response = await api.get(`/budgets/department/${departmentId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get specific budget limit
  getBudgetLimit: async (departmentId, categoryId) => {
    try {
      const response = await api.get(`/budgets/department/${departmentId}/category/${categoryId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create budget limit
  createBudgetLimit: async (budgetData) => {
    try {
      const response = await api.post('/budgets', budgetData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update budget limit
  updateBudgetLimit: async (id, budgetData) => {
    try {
      const response = await api.put(`/budgets/${id}`, budgetData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get budget limit history
  getBudgetLimitHistory: async (departmentId, categoryId) => {
    try {
      const response = await api.get(`/budgets/history/department/${departmentId}/category/${categoryId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get user budget limits
  getUserBudgetLimits: async (userId) => {
    try {
      const response = await api.get(`/budgets/user/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Set user budget limit
  setUserBudgetLimit: async (userData) => {
    try {
      const response = await api.post('/budgets/user', userData);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default budgetService;