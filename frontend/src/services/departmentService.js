// frontend/src/services/departmentService.js
import api from './api';
import axios from 'axios';

const API_URL = '/api/departments';

const departmentService = {
  // Get departments without requiring authentication
  getPublicDepartments: async () => {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching public departments:', error);
      return [];
    }
  },
  
  // Get all departments with authentication
  getAllDepartments: async () => {
    try {
      const response = await api.get('/departments');
      return response;
    } catch (error) {
      console.error('Error fetching all departments:', error);
      // Return empty array instead of throwing to gracefully handle errors
      return [];
    }
  },

  // Get department by ID
  getDepartmentById: async (id) => {
    try {
      if (!id) {
        console.warn('getDepartmentById called with no id');
        return null;
      }
      
      const response = await api.get(`/departments/${id}`);
      return response;
    } catch (error) {
      console.error(`Error fetching department with id ${id}:`, error);
      return null;
    }
  },

  // Find department by name - robust name matching
  findDepartmentByName: async (name) => {
    try {
      if (!name) {
        console.warn('findDepartmentByName called with no name');
        return null;
      }
      
      // Get all departments
      const departments = await departmentService.getAllDepartments();
      
      if (!departments || !departments.length) {
        console.warn('No departments available to search');
        return null;
      }
      
      const nameLower = name.toLowerCase().trim();
      
      // Try exact match first (case-insensitive)
      let match = departments.find(dept => 
        dept.name && dept.name.toLowerCase().trim() === nameLower
      );
      
      if (match) {
        console.log(`Found exact department match for "${name}": ID ${match.id}`);
        return match;
      }
      
      // Try partial match next
      match = departments.find(dept => 
        dept.name && 
        (dept.name.toLowerCase().trim().includes(nameLower) || 
         nameLower.includes(dept.name.toLowerCase().trim()))
      );
      
      if (match) {
        console.log(`Found partial department match for "${name}": ID ${match.id}`);
        return match;
      }
      
      // Try description match as last resort
      match = departments.find(dept => 
        dept.description && 
        (dept.description.toLowerCase().trim().includes(nameLower) || 
         nameLower.includes(dept.description.toLowerCase().trim()))
      );
      
      if (match) {
        console.log(`Found department match in description for "${name}": ID ${match.id}`);
        return match;
      }
      
      console.warn(`No department match found for name "${name}"`);
      return null;
    } catch (error) {
      console.error(`Error finding department by name "${name}":`, error);
      return null;
    }
  },
  
  // Create new department
  createDepartment: async (departmentData) => {
    try {
      const response = await api.post('/departments', departmentData);
      return response;
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  },

  // Update department
  updateDepartment: async (id, departmentData) => {
    try {
      const response = await api.put(`/departments/${id}`, departmentData);
      return response;
    } catch (error) {
      console.error(`Error updating department with id ${id}:`, error);
      throw error;
    }
  },

  // Delete department
  deleteDepartment: async (id) => {
    try {
      const response = await api.delete(`/departments/${id}`);
      return response;
    } catch (error) {
      console.error(`Error deleting department with id ${id}:`, error);
      throw error;
    }
  }
};

export default departmentService;