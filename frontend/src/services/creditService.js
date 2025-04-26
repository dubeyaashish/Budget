// frontend/src/services/creditService.js
import api from './api';

const creditService = {
  createCreditRequest: async (data) => {
    try {
      const response = await api.post('/credits', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getUserCreditRequests: async () => {
    try {
      const response = await api.get('/credits/user');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getLatestUserCreditRequest: async () => {
    try {
      const response = await api.get('/credits/user/latest');
      return response;
    } catch (error) {
      console.error('Error fetching latest user credit request:', error);
      return null;
    }
  },

  getUserCreditRevisionRequests: async () => {
    try {
      const response = await api.get('/credits/revisions');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getAllRevisionRequests: async () => {
    try {
      const response = await api.get('/credits/revisions/all');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getAllPendingRequests: async () => {
    try {
      const response = await api.get('/credits/pending');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getCreditRequestById: async (id) => {
    try {
      const response = await api.get(`/credits/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getCreditRequestVersions: async (requestId) => {
    try {
      const response = await api.get(`/credits/${requestId}/versions`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  approveCreditRequest: async (id, feedback) => {
    try {
      const response = await api.put(`/credits/${id}/approve`, { feedback });
      return response;
    } catch (error) {
      throw error;
    }
  },

  rejectCreditRequest: async (id, reason) => {
    try {
      const response = await api.put(`/credits/${id}/reject`, { reason });
      return response;
    } catch (error) {
      throw error;
    }
  },

  createRevisionVersion: async (id, feedback, amount) => {
    try {
      const response = await api.post(`/credits/${id}/revision`, { feedback, amount });
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateRevisionVersion: async (id, data) => {
    try {
      const response = await api.put(`/credits/${id}/update`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  resolveRevision: async (id) => {
    try {
      const response = await api.put(`/credits/${id}/resolve`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  checkAvailableBudget: async (accountId) => {
    try {
      const response = await api.get(`/credits/check-budget/${accountId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getDepartmentSpendingSummary: async (departmentId) => {
    try {
      const response = await api.get(`/credits/summary/department/${departmentId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  saveDraftCreditRequest: async (data) => {
    try {
      const response = await api.post('/credits/draft', data);
      return response;
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    }
  },

  getUserDraftCreditRequests: async () => {
    try {
      const response = await api.get('/credits/draft');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getBudgetMasterData: async () => {
    try {
      const response = await api.get('/credits/budget-master');
      return response;
    } catch (error) {
      console.error('Error fetching budget master data:', error);
      // Return empty array instead of throwing to make the app more resilient
      return [];
    }
  },
  
  getDepartmentBudgetMasterData: async (departmentId) => {
    try {
      const response = await api.get(`/credits/budget-master/department/${departmentId}`);
      return response;
    } catch (error) {
      console.error(`Error fetching budget master data for department ${departmentId}:`, error);
      // Return empty array for graceful failure
      return [];
    }
  },
  
  // For backward compatibility with any code that might be using this
  getKeyAccounts: async () => {
    try {
      // This is a simple proxy to the key account service
      const response = await api.get('/key-accounts');
      return response;
    } catch (error) {
      console.error('Error fetching key accounts:', error);
      return [];
    }
  }
};

export default creditService;