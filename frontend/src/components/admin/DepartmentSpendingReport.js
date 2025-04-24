// frontend/src/components/admin/DepartmentSpendingReport.js
import React, { useState, useEffect } from 'react';
import departmentService from '../../services/departmentService';
import keyAccountService from '../../services/keyAccountService';
import withdrawalService from '../../services/withdrawalService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const DepartmentSpendingReport = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [accountSpending, setAccountSpending] = useState([]);
  const [departmentSummary, setDepartmentSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await departmentService.getAllDepartments();
        setDepartments(data);
        
        // Set first department as default if available
        if (data.length > 0) {
          setSelectedDepartment(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentData(selectedDepartment);
    }
  }, [selectedDepartment, dateRange]);

  const fetchDepartmentData = async (departmentId) => {
    try {
      setIsLoading(true);
      
      // Fetch account spending data
      const accounts = await keyAccountService.getAccountSpendingByDepartment(departmentId);
      setAccountSpending(accounts);
      
      // Fetch department spending summary
      const summary = await withdrawalService.getDepartmentSpendingSummary(departmentId);
      setDepartmentSummary(summary);
    } catch (err) {
      console.error('Error fetching department data:', err);
      setError('Failed to load department spending data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDepartmentChange = (e) => {
    setSelectedDepartment(e.target.value);
  };

  // Calculate total spending
  const totalSpending = departmentSummary.reduce((sum, item) => sum + parseFloat(item.total_spent || 0), 0);

  // Group accounts by type
  const accountTypes = [...new Set(accountSpending.map(account => account.account_type))].filter(Boolean);
  
  // Calculate spending by account type
  const spendingByType = accountTypes.reduce((acc, type) => {
    const accounts = accountSpending.filter(a => a.account_type === type);
    const totalSpent = accounts.reduce((sum, a) => sum + parseFloat(a.total_spent || 0), 0);
    const totalBudget = accounts.reduce((sum, a) => sum + parseFloat(a.total_budget || 0), 0);
    
    acc[type] = { totalSpent, totalBudget };
    return acc;
  }, {});

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Department Spending Report</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                Select Department
              </label>
              <select
                id="department"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedDepartment}
                onChange={handleDepartmentChange}
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
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={dateRange.startDate}
                onChange={handleDateChange}
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={dateRange.endDate}
                onChange={handleDateChange}
              />
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Spending by Account Type</h2>
              </div>
              
              <div className="p-6">
                {departmentSummary.length > 0 ? (
                  <div className="space-y-4">
                    {departmentSummary.map((item, index) => {
                      const percentage = totalSpending > 0 ? (item.total_spent / totalSpending) * 100 : 0;
                      
                      return (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">{item.account_type || 'Uncategorized'}</span>
                            <span>{formatCurrency(item.total_spent)}</span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full bg-blue-600"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          
                          <p className="text-right text-xs text-gray-500 mt-1">
                            {Math.round(percentage)}% of total spending
                          </p>
                        </div>
                      );
                    })}
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between font-semibold">
                        <span>Total Spending</span>
                        <span>{formatCurrency(totalSpending)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No spending data available for this department.</p>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Budget Utilization</h2>
              </div>
              
              <div className="p-6">
                {accountTypes.length > 0 ? (
                  <div className="space-y-4">
                    {accountTypes.map(type => {
                      const { totalSpent, totalBudget } = spendingByType[type];
                      const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
                      
                      return (
                        <div key={type} className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-medium text-gray-900 mb-2">{type}</h3>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Spent: {formatCurrency(totalSpent)}</span>
                            <span>Budget: {formatCurrency(totalBudget)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                percentage > 90 ? 'bg-red-500' : 
                                percentage > 70 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-right text-xs text-gray-500 mt-1">
                            {Math.round(percentage)}% used
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500">No budget data available for this department.</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Account Breakdown</h2>
            </div>
            
            <div className="p-6">
              {accountSpending.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Budget
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remaining
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usage %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {accountSpending.map(account => {
                        const spent = parseFloat(account.total_spent || 0);
                        const budget = parseFloat(account.total_budget || 0);
                        const remaining = budget - spent;
                        const percentage = budget > 0 ? (spent / budget) * 100 : 0;
                        
                        return (
                          <tr key={account.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {account.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {account.account_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {account.account_type || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(budget)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(spent)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(remaining)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                  <div 
                                    className={`h-2.5 rounded-full ${
                                      percentage > 90 ? 'bg-red-500' : 
                                      percentage > 70 ? 'bg-yellow-500' : 
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {Math.round(percentage)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No account data available for this department.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DepartmentSpendingReport;