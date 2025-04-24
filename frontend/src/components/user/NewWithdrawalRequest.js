// frontend/src/components/user/NewWithdrawalRequest.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import departmentService from '../../services/departmentService';
import categoryService from '../../services/categoryService';
import withdrawalService from '../../services/withdrawalService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const NewWithdrawalRequest = () => {
  const [formData, setFormData] = useState({
    department_id: '',
    category_id: '',
    amount: '',
    reason: ''
  });
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableBudget, setAvailableBudget] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const departmentsData = await departmentService.getAllDepartments();
        const categoriesData = await categoryService.getAllCategories();
        
        setDepartments(departmentsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load departments and categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const checkBudget = async () => {
      if (formData.department_id && formData.category_id) {
        try {
          const budget = await withdrawalService.checkAvailableBudget(
            formData.department_id, 
            formData.category_id
          );
          setAvailableBudget(budget);
        } catch (err) {
          console.error('Error checking budget:', err);
          setAvailableBudget(null);
        }
      } else {
        setAvailableBudget(null);
      }
    };

    checkBudget();
  }, [formData.department_id, formData.category_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.department_id || !formData.category_id || !formData.amount || !formData.reason) {
      setError('Please fill in all fields');
      return;
    }
    
    if (availableBudget && parseFloat(formData.amount) > availableBudget.available_amount) {
      setError(`Amount exceeds available budget of ${formatCurrency(availableBudget.available_amount)}`);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      await withdrawalService.createWithdrawalRequest({
        department_id: formData.department_id,
        category_id: formData.category_id,
        amount: parseFloat(formData.amount),
        reason: formData.reason
      });
      
      setSuccess('Withdrawal request submitted successfully!');
      
      // Reset form
      setFormData({
        department_id: '',
        category_id: '',
        amount: '',
        reason: ''
      });
      
      // Redirect to withdrawal history after 2 seconds
      setTimeout(() => {
        navigate('/withdrawal-history');
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting withdrawal request:', err);
      setError(err.response?.data?.message || 'Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 ml-64 flex justify-center items-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">New Withdrawal Request</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      {success && <AlertMessage type="success" message={success} />}
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 mb-6">
            <div>
              <label htmlFor="department_id" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                id="department_id"
                name="department_id"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={formData.department_id}
                onChange={handleChange}
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
            
            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category_id"
                name="category_id"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={formData.category_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">฿</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>
              {availableBudget && (
                <p className="mt-2 text-sm text-gray-500">
                  Available Budget: {formatCurrency(availableBudget.available_amount)}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                Reason
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={4}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Please provide a detailed reason for this withdrawal request"
                value={formData.reason}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isSubmitting ? <LoadingSpinner /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewWithdrawalRequest;