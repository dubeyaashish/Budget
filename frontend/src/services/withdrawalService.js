import api from './api';

const withdrawalService = {
  // Create withdrawal request
  createWithdrawalRequest: async (requestData) => {
    try {
      const response = await api.post('/withdrawals', requestData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get user withdrawal requests
  getUserWithdrawalRequests: async () => {
    try {
      const response = await api.get('/withdrawals/user');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get all pending withdrawal requests (admin only)
  getAllPendingRequests: async () => {
    try {
      const response = await api.get('/withdrawals/pending');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get department pending withdrawal requests
  getDepartmentPendingRequests: async (departmentId) => {
    try {
      const response = await api.get(`/withdrawals/pending/department/${departmentId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Approve withdrawal request
  approveWithdrawalRequest: async (requestId) => {
    try {
      const response = await api.put(`/withdrawals/${requestId}/approve`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reject withdrawal request
  rejectWithdrawalRequest: async (requestId, reason) => {
    try {
      const response = await api.put(`/withdrawals/${requestId}/reject`, { reason });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Check available budget
  checkAvailableBudget: async (departmentId, categoryId) => {
    try {
      const response = await api.get(`/withdrawals/check-budget/${departmentId}/${categoryId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default withdrawalService;