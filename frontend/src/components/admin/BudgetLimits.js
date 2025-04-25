// frontend/src/components/admin/BudgetLimits.js
import React, { useState, useEffect } from 'react';
import budgetService from '../../services/budgetService';
import departmentService from '../../services/departmentService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const BudgetLimits = () => {
  const [budgetLimits, setBudgetLimits] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [limitHistory, setLimitHistory] = useState([]);
  const [selectedLimit, setSelectedLimit] = useState(null);
  
  // Form data for creating/updating budget limit
  const [formData, setFormData] = useState({
    department_id: '',
    total_amount: '',
    per_user_amount: '',
    reason: ''
  });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'update'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [depsData] = await Promise.all([
          departmentService.getAllDepartments(),
        ]);
        
        setDepartments(depsData);
        
        // If there are departments, select the first one by default
        if (depsData.length > 0) {
          setSelectedDepartment(depsData[0].id);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchBudgetLimits(selectedDepartment);
    }
  }, [selectedDepartment]);

  const fetchBudgetLimits = async (departmentId) => {
    try {
      setIsLoading(true);
      const limits = await budgetService.getBudgetLimitsByDepartment(departmentId);
      setBudgetLimits(limits);
    } catch (err) {
      console.error('Error fetching budget limits:', err);
      setError('Failed to load budget limits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const openCreateModal = () => {
    setFormData({
      department_id: selectedDepartment,
      total_amount: '',
      per_user_amount: '',
      reason: ''
    });
    setModalMode('create');
    setShowModal(true);
  };

  const openUpdateModal = (limit) => {
    setFormData({
      department_id: limit.department_id,
      total_amount: limit.total_amount,
      per_user_amount: limit.per_user_amount || '',
      reason: ''
    });
    setSelectedLimit(limit);
    setModalMode('update');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      department_id: selectedDepartment,
      total_amount: '',
      per_user_amount: '',
      reason: ''
    });
    setSelectedLimit(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.department_id || !formData.total_amount) {
      setError('Department and total amount are required');
      return;
    }
    
    if (modalMode === 'update' && !formData.reason) {
      setError('Please provide a reason for the change');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (modalMode === 'create') {
        await budgetService.createBudgetLimit({
          department_id: formData.department_id,
          total_amount: parseFloat(formData.total_amount),
          per_user_amount: formData.per_user_amount ? parseFloat(formData.per_user_amount) : null
        });
        
        setSuccess('Budget limit created successfully');
      } else {
        await budgetService.updateBudgetLimit(selectedLimit.id, {
          department_id: formData.department_id,
          total_amount: parseFloat(formData.total_amount),
          per_user_amount: formData.per_user_amount ? parseFloat(formData.per_user_amount) : null,
          reason: formData.reason
        });
        
        setSuccess('Budget limit updated successfully');
      }
      
      // Refresh the budget limits
      await fetchBudgetLimits(selectedDepartment);
      
      // Close the modal
      closeModal();
    } catch (err) {
      console.error('Error saving budget limit:', err);
      setError(err.response?.data?.message || 'Failed to save budget limit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewLimitHistory = async (departmentId) => {
    try {
      setIsLoading(true);
      const history = await budgetService.getBudgetLimitHistory(departmentId);
      setLimitHistory(history);
      setShowHistory(true);
    } catch (err) {
      console.error('Error fetching budget limit history:', err);
      setError('Failed to load budget limit history');
    } finally {
      setIsLoading(false);
    }
  };

  const closeHistory = () => {
    setShowHistory(false);
    setLimitHistory([]);
  };

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Budget Limits</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      {success && <AlertMessage type="success" message={success} />}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="w-full md:w-1/3 mb-4 md:mb-0">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                Select Department
              </label>
              <select
                id="department"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedDepartment}
                onChange={handleDepartmentChange}
              >
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add New Budget Limit
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          ) : budgetLimits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Per User Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {budgetLimits.map(limit => (
                    <tr key={limit.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(limit.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {limit.per_user_amount ? formatCurrency(limit.per_user_amount) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(limit.updated_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openUpdateModal(limit)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => viewLimitHistory(limit.department_id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 py-4">No budget limits found for this department.</p>
          )}
        </div>
      </div>
      
      {/* Create/Update Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg max-w-lg mx-auto p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' ? 'Add New Budget Limit' : 'Update Budget Limit'}
            </h2>
            
            <form onSubmit={handleSubmit}>
            // frontend/src/components/admin/BudgetLimits.js (continued)

<div className="mb-4">
  <label htmlFor="modal_department_id" className="block text-sm font-medium text-gray-700 mb-1">
    Department
  </label>
  <select
    id="modal_department_id"
    name="department_id"
    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
    value={formData.department_id}
    onChange={handleFormChange}
    disabled={modalMode === 'update'}
    required
  >
    <option value="">Select Department</option>
    {departments.map(dept => (
      <option key={dept.id} value={dept.id}>
        {dept.name}
      </option>
    ))}
  </select>
</div>


<div className="mb-4">
  <label htmlFor="modal_total_amount" className="block text-sm font-medium text-gray-700 mb-1">
    Total Budget Amount
  </label>
  <div className="mt-1 relative rounded-md shadow-sm">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <span className="text-gray-500 sm:text-sm">฿</span>
    </div>
    <input
      type="number"
      id="modal_total_amount"
      name="total_amount"
      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
      placeholder="0.00"
      step="0.01"
      min="0"
      value={formData.total_amount}
      onChange={handleFormChange}
      required
    />
  </div>
</div>

<div className="mb-4">
  <label htmlFor="modal_per_user_amount" className="block text-sm font-medium text-gray-700 mb-1">
    Per User Amount (Optional)
  </label>
  <div className="mt-1 relative rounded-md shadow-sm">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <span className="text-gray-500 sm:text-sm">฿</span>
    </div>
    <input
      type="number"
      id="modal_per_user_amount"
      name="per_user_amount"
      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
      placeholder="0.00"
      step="0.01"
      min="0"
      value={formData.per_user_amount}
      onChange={handleFormChange}
    />
  </div>
  <p className="mt-1 text-sm text-gray-500">
    Leave empty if no per-user limit is needed
  </p>
</div>

{modalMode === 'update' && (
  <div className="mb-4">
    <label htmlFor="modal_reason" className="block text-sm font-medium text-gray-700 mb-1">
      Reason for Change
    </label>
    <textarea
      id="modal_reason"
      name="reason"
      rows={3}
      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
      placeholder="Please explain why this budget limit is being changed"
      value={formData.reason}
      onChange={handleFormChange}
      required
    />
  </div>
)}

<div className="mt-6 flex justify-end">
  <button
    type="button"
    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
    onClick={closeModal}
  >
    Cancel
  </button>
  <button
    type="submit"
    disabled={isSubmitting}
    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  >
    {isSubmitting ? <LoadingSpinner /> : modalMode === 'create' ? 'Create' : 'Update'}
  </button>
</div>
</form>
</div>
</div>
)}

{/* History Modal */}
{showHistory && (
<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
<div className="relative bg-white rounded-lg max-w-4xl mx-auto p-8 shadow-xl">
<h2 className="text-xl font-bold mb-4">Budget Limit History</h2>

{limitHistory.length > 0 ? (
<div className="overflow-x-auto">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Date
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Changed By
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Previous Total
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          New Total
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Previous Per User
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          New Per User
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Reason
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {limitHistory.map(history => (
        <tr key={history.id}>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {new Date(history.created_at).toLocaleString()}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {history.admin_name} {history.admin_surname}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(history.previous_total_amount)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(history.new_total_amount)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {history.previous_per_user_amount ? formatCurrency(history.previous_per_user_amount) : 'N/A'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {history.new_per_user_amount ? formatCurrency(history.new_per_user_amount) : 'N/A'}
          </td>
          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
            {history.change_reason}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
) : (
<p className="text-gray-500">No history found for this budget limit.</p>
)}

<div className="mt-6 flex justify-end">
<button
  type="button"
  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  onClick={closeHistory}
>
  Close
</button>
</div>
</div>
</div>
)}
</div>
);
};

export default BudgetLimits;