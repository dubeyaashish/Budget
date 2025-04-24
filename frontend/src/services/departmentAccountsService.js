// frontend/src/services/departmentAccountsService.js
import api from './api';

const departmentAccountsService = {
  // Get accounts frequently used by a department
  getDepartmentAccounts: async (departmentId) => {
    try {
      // First try to get the data from the API
      const response = await api.get(`/department-accounts/${departmentId}`);
      return response;
    } catch (error) {
      console.warn('Failed to get department accounts from API, falling back to local lookup');
      // If we have a utility function to import the data from an external file, use that instead
      return getDepartmentAccountsFromSystem(departmentId);
    }
  }
};

// This function would be an implementation that accesses the external data file
// The actual implementation would depend on how you've set up your data access
const getDepartmentAccountsFromSystem = async (departmentId) => {
  try {
    // In a real implementation, this would use some method to access the JSON file
    // For example, if you're using webpack:
    // const departmentAccountsData = await import('../../data/departmentAccounts.json');
    
    // Or if you're storing it in a public folder, you might fetch it:
    const response = await fetch('/data/departmentAccounts.json');
    if (!response.ok) {
      throw new Error('Failed to load department accounts data');
    }
    
    const allDepartments = await response.json();
    
    // Get department name first from the departments API
    const deptResponse = await api.get(`/departments/${departmentId}`);
    const departmentName = deptResponse?.name;
    
    // Find the department in the data
    const departmentData = allDepartments.find(
      dept => (dept.Department === departmentName) || 
             (departmentName && departmentName.includes(dept.Department))
    );
    
    if (departmentData && departmentData.Accounts) {
      // Transform to consistent format
      const accounts = departmentData.Accounts.map(acc => ({
        id: acc["Key Account ID"],
        name: acc["Key Account"]
      }));
      
      return { accounts };
    }
    
    return { accounts: [] };
  } catch (err) {
    console.error("Error retrieving department accounts:", err);
    return { accounts: [] };
  }
};

export default departmentAccountsService;