// frontend/src/components/admin/KeyAccountMatrixView.js
import React, { useState, useEffect, useContext } from 'react';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import creditService from '../../services/creditService';
import departmentService from '../../services/departmentService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const KeyAccountMatrixView = () => {
  const { keyAccounts, fetchKeyAccounts } = useContext(KeyAccountContext);
  const [departments, setDepartments] = useState([]);
  const [matrixData, setMatrixData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAccountType, setSelectedAccountType] = useState('');
  
  // Get unique account types
  const accountTypes = [...new Set(keyAccounts.map(account => account.account_type))].filter(Boolean);
  
  // Filtered accounts based on selected type
  const filteredAccounts = selectedAccountType 
    ? keyAccounts.filter(acc => acc.account_type === selectedAccountType)
    : keyAccounts;

  useEffect(() => {
    const fetchDepartmentsAndBudgetData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch departments
        const departmentsData = await departmentService.getAllDepartments();
        setDepartments(departmentsData);
        
        // Fetch budget master data
        const budgetData = await creditService.getBudgetMasterData();
        
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
          // Find department id from department_name
          const dept = departmentsData.find(d => 
            d.name === item.department_name || 
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
  departments.forEach(dept => {
    if (matrixData[dept.id]) {
      departmentTotals[dept.id] = Object.values(matrixData[dept.id]).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    } else {
      departmentTotals[dept.id] = 0;
    }
  });

  // Calculate totals by account
  const accountTotals = {};
  filteredAccounts.forEach(account => {
    accountTotals[account.id] = departments.reduce((sum, dept) => {
      return sum + ((matrixData[dept.id] && matrixData[dept.id][account.id]) ? parseFloat(matrixData[dept.id][account.id]) : 0);
    }, 0);
  });

  // Calculate grand total
  const grandTotal = filteredAccounts.reduce((sum, account) => sum + (accountTotals[account.id] || 0), 0);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Key Account Matrix View</h2>
        <p className="mt-1 text-sm text-gray-500">
          View budget allocation amounts across departments and key accounts
        </p>
        
        <div className="mt-4">
          <label htmlFor="account-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Account Type
          </label>
          <select
            id="account-type-filter"
            className="mt-1 block w-full md:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
      
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="large" />
          </div>
        ) : error ? (
          <AlertMessage type="error" message={error} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Department
                  </th>
                  {filteredAccounts.map(account => (
                    <th key={account.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {account.name}
                      <div className="text-xxs font-normal normal-case text-gray-400">{account.account_type || 'Unknown'}</div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {departments.map(dept => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                      {dept.name}
                    </td>
                    {filteredAccounts.map(account => (
                      <td key={`${dept.id}-${account.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {matrixData[dept.id] && matrixData[dept.id][account.id] !== undefined 
                          ? formatCurrency(matrixData[dept.id][account.id]) 
                          : formatCurrency(0)}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-100">
                      {formatCurrency(departmentTotals[dept.id] || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-100 z-10">
                    Total
                  </th>
                  {filteredAccounts.map(account => (
                    <th key={`total-${account.id}`} className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {formatCurrency(accountTotals[account.id] || 0)}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-200">
                    {formatCurrency(grandTotal)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyAccountMatrixView;