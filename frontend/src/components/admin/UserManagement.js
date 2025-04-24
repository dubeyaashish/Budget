// frontend/src/components/admin/UserManagement.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import departmentService from '../../services/departmentService';

// Create a user service for user management API calls
const userService = {
  getAllUsers: () => {
    return axios.get('/api/users').then(response => response.data);
  },
  updateUserRole: (userId, role) => {
    return axios.put(`/api/users/${userId}/role`, { role }).then(response => response.data);
  },
  updateUserDepartment: (userId, departmentId) => {
    return axios.put(`/api/users/${userId}/department`, { departmentId }).then(response => response.data);
  },
  deleteUser: (userId) => {
    return axios.delete(`/api/users/${userId}`).then(response => response.data);
  }
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usersData, departmentsData] = await Promise.all([
        userService.getAllUsers(),
        departmentService.getAllDepartments()
      ]);
      
      setUsers(usersData);
      setDepartments(departmentsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRoleChange = async (userId, newRole) => {
    try {
      setIsLoading(true);
      await userService.updateUserRole(userId, newRole);
      setSuccess(`User role updated successfully to ${newRole}`);
      
      // Update local user data
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDepartmentChange = async (userId, departmentId) => {
    try {
      setIsLoading(true);
      await userService.updateUserDepartment(userId, departmentId);
      setSuccess('User department updated successfully');
      
      // Update local user data
      // This would need a more complex update if a user can belong to multiple departments
      fetchData(); // Refetch all data for simplicity
    } catch (err) {
      console.error('Error updating user department:', err);
      setError(err.response?.data?.message || 'Failed to update user department');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        await userService.deleteUser(userId);
        setSuccess('User deleted successfully');
        
        // Remove user from local state
        setUsers(users.filter(user => user.id !== userId));
      } catch (err) {
        console.error('Error deleting user:', err);
        setError(err.response?.data?.message || 'Failed to delete user');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      {success && <AlertMessage type="success" message={success} />}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Users</h2>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name} {user.surname}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.employee_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select
                          value={user.department_id || ''}
                          onChange={(e) => handleDepartmentChange(user.id, e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;