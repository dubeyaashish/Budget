// frontend/src/components/admin/DepartmentMatrixView.js
import React, { useState, useEffect, useContext } from 'react';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import creditService from '../../services/creditService';
import departmentService from '../../services/departmentService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const DepartmentMatrixView = () => {
  const { keyAccounts } = useContext(KeyAccountContext);
  const [departments, setDepartments] = useState([]);
  const [matrixData, setMatrixData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState('');
  const [budgetMasterData, setBudgetMasterData] = useState([]);
  
  // Get unique account types for filtering
  const accountTypes = [...new Set(keyAccounts.map(account => account.account_type))].filter(Boolean);
  
  // Filter accounts based on selected type
  const filteredAccounts = selectedAccountType 
    ? keyAccounts.filter(acc => acc.account_type === selectedAccountType)
    : keyAccounts;
  
  // Filter departments based on selection
  const filteredDepartments = selectedDepartment
    ? departments.filter(dept => dept.id === parseInt(selectedDepartment))
    : departments;

  useEffect(() => {
    const fetchDepartmentsAndBudgetData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch departments
        const departmentsData = await departmentService.getAllDepartments();
        setDepartments(departmentsData);
        
        if (departmentsData.length > 0 && !selectedDepartment) {
          setSelectedDepartment(departmentsData[0].id.toString());
        }
        
        // Fetch budget master data
        const budgetData = await creditService.getBudgetMasterData();
        console.log('Raw budget master data:', budgetData);
        setBudgetMasterData(budgetData);
        
        // Transform the data into a matrix format: { dept_id: { account_id: amount } }
        const matrix = {};
        
        // Initialize matrix with all departments and accounts set to 0
        departmentsData.forEach(dept => {
          matrix[dept.id] = {};
          keyAccounts.forEach(account => {
            matrix[dept.id][account.id] = 0;
          });
        });
        
        // Fill in the actual values from budget data
        budgetData.forEach(item => {
          // Try to find department by name or id
          const dept = departmentsData.find(d => 
            (item.department_name && d.name === item.department_name) || 
            (item.department && d.id === parseInt(item.department))
          );
          
          if (dept && item.key_account) {
            // If we have a valid department and key account, update the matrix
            if (!matrix[dept.id]) {
              matrix[dept.id] = {};
            }
            matrix[dept.id][item.key_account] = parseFloat(item.amount) || 0;
          }
        });
        
        console.log('Transformed matrix data:', matrix);
        setMatrixData(matrix);
      } catch (err) {
        console.error('Error fetching matrix data:', err);
        setError('Failed to load department and budget data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartmentsAndBudgetData();
  }, [keyAccounts]);

  // Calculate totals by department
  const departmentTotals = {};
  filteredDepartments.forEach(dept => {
    if (matrixData[dept.id]) {
      departmentTotals[dept.id] = filteredAccounts.reduce(
        (sum, account) => sum + (matrixData[dept.id][account.id] || 0), 
        0
      );
    } else {
      departmentTotals[dept.id] = 0;
    }
  });

  // Calculate totals by account
  const accountTotals = {};
  filteredAccounts.forEach(account => {
    accountTotals[account.id] = filteredDepartments.reduce(
      (sum, dept) => sum + ((matrixData[dept.id] && matrixData[dept.id][account.id]) || 0),
      0
    );
  });

  // Calculate grand total
  const grandTotal = Object.values(departmentTotals).reduce((sum, total) => sum + total, 0);
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Department Budget Matrix</h2>
        <p className="mt-1 text-sm text-gray-500">
          View budget allocation amounts across departments and key accounts
        </p>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Department
            </label>
            <select
              id="department-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="account-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Account Type
            </label>
            <select
              id="account-type-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedAccountType}
              onChange={(e) => setSelectedAccountType(e.target.value)}
            >
              <option value="">All Account Types</option>
              {accountTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="large" />
          </div>
        ) : error ? (
          <AlertMessage type="error" message={error} />
        ) : (
          <div className="overflow-x-auto">
            {budgetMasterData.length === 0 ? (
              <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">No budget data found</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>No budget master data available. Please allocate budgets to view the matrix.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      Key Account
                    </th>
                    {filteredDepartments.map(dept => (
                      <th key={dept.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {dept.name}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccounts.map(account => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div>{account.name}</div>
                        <div className="text-xs text-gray-500">{account.account_type || 'Unknown'}</div>
                      </td>
                      {filteredDepartments.map(dept => (
                        <td key={`${account.id}-${dept.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {matrixData[dept.id] && matrixData[dept.id][account.id] !== undefined 
                            ? formatCurrency(matrixData[dept.id][account.id]) 
                            : formatCurrency(0)}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-100">
                        {formatCurrency(accountTotals[account.id] || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-100 z-10">
                      Total
                    </th>
                    {filteredDepartments.map(dept => (
                      <th key={`total-${dept.id}`} className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {formatCurrency(departmentTotals[dept.id] || 0)}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-200">
                      {formatCurrency(grandTotal)}
                    </th>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentMatrixView;