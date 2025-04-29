import api from './api';
import departmentService from './departmentService';

const creditService = {
  // Create a new credit request
  createCreditRequest: async (data) => {
    try {
      console.log('Creating credit request with data:', data);
      const response = await api.post('/credits', data);
      console.log('API Response from credit request creation:', response);
      return response;
    } catch (error) {
      console.error('Error in createCreditRequest:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get all user credit requests
  getUserCreditRequests: async () => {
    try {
      const response = await api.get('/credits/user');
      return response;
    } catch (error) {
      console.error('Error in getUserCreditRequests:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get latest user credit request
  getLatestUserCreditRequest: async () => {
    try {
      const response = await api.get('/credits/user/latest');
      return response;
    } catch (error) {
      console.error('Error fetching latest user credit request:', error.response?.data || error.message);
      return null;
    }
  },

  // Get requests that need revision for a user
  getUserCreditRevisionRequests: async () => {
    try {
      const response = await api.get('/credits/revisions');
      return response;
    } catch (error) {
      console.error('Error in getUserCreditRevisionRequests:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get all revision requests (admin only)
  getAllRevisionRequests: async () => {
    try {
      const response = await api.get('/credits/revisions/all');
      return response;
    } catch (error) {
      console.error('Error in getAllRevisionRequests:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get all pending requests (admin only)
  getAllPendingRequests: async () => {
    try {
      const response = await api.get('/credits/pending');
      return response;
    } catch (error) {
      console.error('Error in getAllPendingRequests:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get credit request by ID
  getCreditRequestById: async (id) => {
    try {
      if (!id) {
        console.warn('getCreditRequestById called with no ID');
        return null;
      }
      const response = await api.get(`/credits/${id}`);
      return response;
    } catch (error) {
      console.error(`Error in getCreditRequestById for ID ${id}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Get version history for a request
  getCreditRequestVersions: async (requestId) => {
    try {
      if (!requestId) {
        console.warn('getCreditRequestVersions called with no requestId');
        return [];
      }
      const response = await api.get(`/credits/${requestId}/versions`);
      return response;
    } catch (error) {
      console.error(`Error in getCreditRequestVersions for ID ${requestId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Approve a credit request (admin only)
  approveCreditRequest: async (id, data = {}) => {
    try {
      console.log(`Approving credit request ID: ${id} with data:`, data);
      const response = await api.put(`/credits/${id}/approve`, data);
      console.log('Approval response:', response);
      return response;
    } catch (error) {
      console.error('Error in approveCreditRequest:', error.response?.data || error.message);
      throw error;
    }
  },

  // Reject a credit request (admin only)
  rejectCreditRequest: async (id, data) => {
    try {
      const response = await api.put(`/credits/${id}/reject`, data);
      return response;
    } catch (error) {
      console.error('Error in rejectCreditRequest:', error.response?.data || error.message);
      throw error;
    }
  },

  // Request revision for a credit request (admin only)
  createRevisionRequest: async (id, data) => {
    try {
      console.log(`Creating revision request for ID ${id} with data:`, data);
      const response = await api.post(`/credits/${id}/revision`, data);
      console.log('Revision request response:', response);
      return response;
    } catch (error) {
      console.error('Error in createRevisionRequest:', error.response?.data || error.message);
      throw error;
    }
  },

  // Update a revision request (user responding to admin)
  updateRevisionVersion: async (id, data) => {
    try {
      console.log(`Updating revision for ID ${id} with data:`, data);
      const response = await api.put(`/credits/${id}/update`, data);
      console.log('Update revision response:', response);
      return response;
    } catch (error) {
      console.error('Error in updateRevisionVersion:', error.response?.data || error.message);
      throw error;
    }
  },

  // Resolve a revision request (admin only)
  resolveRevision: async (id) => {
    try {
      const response = await api.put(`/credits/${id}/resolve`);
      return response;
    } catch (error) {
      console.error('Error in resolveRevision:', error.response?.data || error.message);
      throw error;
    }
  },

  // Check available budget for a key account
  checkAvailableBudget: async (accountId) => {
    try {
      const response = await api.get(`/credits/check-budget/${accountId}`);
      return response;
    } catch (error) {
      console.error('Error in checkAvailableBudget:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get department spending summary
  getDepartmentSpendingSummary: async (departmentId) => {
    try {
      const response = await api.get(`/credits/summary/department/${departmentId}`);
      return response;
    } catch (error) {
      console.error('Error in getDepartmentSpendingSummary:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get budget master data (all departments)
  getBudgetMasterData: async () => {
    try {
      const response = await api.get('/credits/budget-master');
      return response;
    } catch (error) {
      console.error('Error in getBudgetMasterData:', error.response?.data || error.message);
      return [];
    }
  },

  // Get budget master data for a specific department with robust fallbacks
  getDepartmentBudgetMasterData: async (departmentId) => {
    try {
      if (!departmentId) {
        console.warn('getDepartmentBudgetMasterData called with no departmentId');
        return [];
      }
      
      console.log(`Fetching budget data for department ID: ${departmentId}`);
      
      // Try primary method first - direct endpoint
      try {
        const response = await api.get(`/credits/budget-master/department/${departmentId}`);
        console.log(`Retrieved ${response.data.length} budget records from direct endpoint`);
        
        if (response.data && response.data.length > 0) {
          return response.data;
        }
      } catch (directErr) {
        console.warn(`Primary budget data endpoint failed: ${directErr.message}`);
      }
      
      // Second attempt - get all budget data and filter
      try {
        console.log('Fetching all budget master data for filtering');
        const allData = await api.get('/credits/budget-master');
        
        if (allData.data && allData.data.length > 0) {
          // First try direct ID match
          let filteredData = allData.data.filter(item => {
            return String(item.department || '') === String(departmentId);
          });
          
          if (filteredData.length > 0) {
            console.log(`Found ${filteredData.length} records with exact department ID match`);
            return filteredData;
          }
          
          // If no direct match, try to get the department name
          try {
            const deptInfo = await departmentService.getDepartmentById(departmentId);
            if (deptInfo && deptInfo.name) {
              // Try matching by department name
              filteredData = allData.data.filter(item => {
                if (!item.department_name) return false;
                
                const itemDeptName = item.department_name.toLowerCase();
                const deptName = deptInfo.name.toLowerCase();
                
                return (
                  itemDeptName === deptName || 
                  itemDeptName.includes(deptName) || 
                  deptName.includes(itemDeptName)
                );
              });
              
              if (filteredData.length > 0) {
                console.log(`Found ${filteredData.length} records with department name match`);
                // Update department field to ensure consistency
                filteredData = filteredData.map(item => ({
                  ...item,
                  department: departmentId
                }));
                return filteredData;
              }
            }
          } catch (deptErr) {
            console.warn('Failed to get department name:', deptErr.message);
          }
          
          console.warn(`No budget data found for department ID ${departmentId} after filtering`);
        }
      } catch (filterErr) {
        console.warn('Failed to filter budget data:', filterErr.message);
      }
      
      // Return empty array if all attempts fail
      return [];
      
    } catch (error) {
      console.error(`Error in getDepartmentBudgetMasterData for ID ${departmentId}:`, error.response?.data || error.message);
      return [];
    }
  },
  
  // Batch approve multiple credit requests
  batchApproveCreditRequests: async (requestIds, feedbackData = {}) => {
    try {
      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        throw new Error('No request IDs provided for batch approval');
      }
      
      console.log(`Batch approving ${requestIds.length} credit requests with feedback:`, feedbackData);
      
      const response = await api.post('/credits/batch/approve', {
        requestIds,
        feedback: feedbackData.feedback || ''
      });
      
      console.log('Batch approval response:', response);
      return response;
    } catch (error) {
      console.error('Error in batchApproveCreditRequests:', error.response?.data || error.message);
      throw error;
    }
  },

  // Batch reject multiple credit requests
  batchRejectCreditRequests: async (requestIds, rejectionData) => {
    try {
      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        throw new Error('No request IDs provided for batch rejection');
      }
      
      if (!rejectionData.reason) {
        throw new Error('Rejection reason is required for batch rejection');
      }
      
      const response = await api.post('/credits/batch/reject', {
        requestIds,
        reason: rejectionData.reason
      });
      
      return response;
    } catch (error) {
      console.error('Error in batchRejectCreditRequests:', error.response?.data || error.message);
      throw error;
    }
  },

  // Batch request revision for multiple credit requests
  batchCreateRevisionRequests: async (requestIds, revisionData) => {
    try {
      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        throw new Error('No request IDs provided for batch revision');
      }
      
      const response = await api.post('/credits/batch/revision', {
        requestIds,
        feedback: revisionData.feedback || '',
        suggestedAmount: revisionData.suggestedAmount || null
      });
      
      return response;
    } catch (error) {
      console.error('Error in batchCreateRevisionRequests:', error.response?.data || error.message);
      throw error;
    }
  },

  // Batch update revisions
  batchUpdateRevisions: async (revisions) => {
    try {
      if (!Array.isArray(revisions) || revisions.length === 0) {
        throw new Error('No revision data provided for batch update');
      }
      
      const response = await api.post('/credits/batch/update-revisions', {
        revisions
      });
      
      return response;
    } catch (error) {
      console.error('Error in batchUpdateRevisions:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default creditService;