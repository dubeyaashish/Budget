import api from './api';




const creditService = {
  createCreditRequest: async (data) => {
    const response = await api.post('/credits', data);
    return response.data;
  },

  getUserCreditRequests: async () => {
    const response = await api.get('/credits/user');
    return response.data;
  },

  getLatestUserCreditRequest: async () => {
    const response = await api.get('/credits/user/latest');
    return response.data;
  },


  getUserCreditRevisionRequests: async () => {
    const response = await api.get('/credits/revisions');
    return response.data;
  },

  getAllRevisionRequests: async () => {
    const response = await api.get('/credits/revisions/all');
    return response.data;
  },

  getAllPendingRequests: async () => {
    const response = await api.get('/credits/pending');
    return response.data;
  },

  getCreditRequestById: async (id) => {
    const response = await api.get(`/credits/${id}`);
    return response.data;
  },

  getCreditRequestVersions: async (requestId) => {
    const response = await api.get(`/credits/${requestId}/versions`);
    return response.data;
  },

  approveCreditRequest: async (id, feedback) => {
    const response = await api.put(`/credits/${id}/approve`, { feedback });
    return response.data;
  },

  rejectCreditRequest: async (id, feedback) => {
    const response = await api.put(`/credits/${id}/reject`, { feedback });
    return response.data;
  },

  createRevisionVersion: async (id, data) => {
    const response = await api.post(`/credits/${id}/revision`, data);
    return response.data;
  },

  updateRevisionVersion: async (id, data) => {
    const response = await api.put(`/credits/${id}/update`, data);
    return response.data;
  },

  resolveRevision: async (id, data) => {
    const response = await api.put(`/credits/${id}/resolve`, data);
    return response.data;
  },

  checkAvailableBudget: async (accountId) => {
    const response = await api.get(`/credits/check-budget/${accountId}`);
    return response.data;
  },

  getDepartmentSpendingSummary: async (departmentId) => {
    const response = await api.get(`/credits/summary/department/${departmentId}`);
    return response.data;
  },

  saveDraftCreditRequest: async (data) => {
    const response = await api.post('/credits/draft', data);
    return response.data;
  },

  getUserDraftCreditRequests: async () => {
    const response = await api.get('/credits/draft');
    return response.data;
  },

  getKeyAccounts: async () => {
    const response = await api.get('/key-accounts');
    return response.data;
  }
};

export default creditService;