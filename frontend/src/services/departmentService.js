import api from './api';
import axios from 'axios';

const API_URL = '/api/departments';


const departmentService = {

  getPublicDepartments: async () => {
    const response = await axios.get(API_URL);
    return response.data;
  },
  // Get all departments
  getAllDepartments: async () => {
    try {
      const response = await api.get('/departments');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get department by ID
  getDepartmentById: async (id) => {
    try {
      const response = await api.get(`/departments/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Create new department
  createDepartment: async (departmentData) => {
    try {
      const response = await api.post('/departments', departmentData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update department
  updateDepartment: async (id, departmentData) => {
    try {
      const response = await api.put(`/departments/${id}`, departmentData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Delete department
  deleteDepartment: async (id) => {
    try {
      const response = await api.delete(`/departments/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default departmentService;