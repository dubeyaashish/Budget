// frontend/src/services/keyAccountService.js
import api from './api';

const keyAccountService = {
  // Get all key accounts
  getAllKeyAccounts: async () => {
    try {
      const response = await api.get('/key-accounts');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get key account by ID
  getKeyAccountById: async (id) => {
    try {
      const response = await api.get(`/key-accounts/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create or update key account
  upsertKeyAccount: async (accountData) => {
    try {
      const response = await api.post('/key-accounts', accountData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get key accounts with usage data
  getKeyAccountsWithUsage: async () => {
    try {
      const response = await api.get('/key-accounts/usage/all');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get department-wise spending for a key account
  getDepartmentSpendingByAccount: async (accountId) => {
    try {
      const response = await api.get(`/key-accounts/${accountId}/departments`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get account-wise spending for a department
  getAccountSpendingByDepartment: async (departmentId) => {
    try {
      const response = await api.get(`/key-accounts/departments/${departmentId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get total budget summary
  getBudgetSummary: async () => {
    try {
      const response = await api.get('/key-accounts/summary/budget');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default keyAccountService;