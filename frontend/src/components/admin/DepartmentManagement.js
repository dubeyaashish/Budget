// frontend/src/components/admin/DepartmentManagement.js
import React, { useState, useEffect, useContext } from 'react';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import departmentService from '../../services/departmentService';
import creditService from '../../services/creditService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const DepartmentManagement = () => {
  const { keyAccounts } = useContext(KeyAccountContext);
  
  const [departments, setDepartments] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [departmentTotals, setDepartmentTotals] = useState({});
  const [accountsByDepartment, setAccountsByDepartment] = useState({});
  
  // Load departments and budget data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get departments
        const departmentsData = await departmentService.getAllDepartments();
        setDepartments(departmentsData);
        
        // Get budget master data
        const budgetMasterData = await creditService.getBudgetMasterData();
        console.log('Raw budget master data:', budgetMasterData);
        setBudgetData(budgetMasterData);
        
        // Process data for department totals and account distribution
        const totals = {};
        const accDistribution = {};
        
        budgetMasterData.forEach(item => {
          // Skip entries with no key_account or amount
          if (!item.key_account || !item.amount) return;
          
          const deptId = item.department;
          const deptName = item.department_name;
          const amount = parseFloat(item.amount) || 0;
          const accountId = item.key_account;
          const accountName = item.key_account_name;
          
          // Find department id from name if we only have name
          let departmentId = deptId;
          if (!departmentId && deptName) {
            const dept = departmentsData.find(d => d.name === deptName);
            if (dept) departmentId = dept.id;
          }
          
          if (!departmentId) return;
          
          // Sum up totals by department
          if (!totals[departmentId]) {
            totals[departmentId] = 0;
          }
          totals[departmentId] += amount;
          
          // Track account distribution
          if (!accDistribution[departmentId]) {
            accDistribution[departmentId] = {};
          }
          
          const accountKey = `${accountId}-${accountName}`;
          if (!accDistribution[departmentId][accountKey]) {
            accDistribution[departmentId][accountKey] = {
              id: accountId,
              name: accountName,
              amount: 0
            };
          }
          
          accDistribution[departmentId][accountKey].amount += amount;
        });
        
        console.log('Department totals:', totals);
        console.log('Account distribution:', accDistribution);
        
        setDepartmentTotals(totals);
        setAccountsByDepartment(accDistribution);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load department and budget data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Toggle department expansion
  const toggleDepartmentExpand = (deptId) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [deptId]: !prev[deptId]
    }));
  };
  
  // Get enriched departments with totals
  const getEnrichedDepartments = () => {
    return departments.map(dept => ({
      ...dept,
      totalBudget: departmentTotals[dept.id] || 0
    }));
  };
  
  // Sort accounts by amount for a department
  const getSortedAccounts = (deptId) => {
    if (!accountsByDepartment[deptId]) return [];
    
    return Object.values(accountsByDepartment[deptId])
      .sort((a, b) => b.amount - a.amount);
  };
  
  const enrichedDepartments = getEnrichedDepartments();
  
  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Department Management</h1>
      
      {error && <AlertMessage type="error" message={error} />}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Departments</h2>
          <p className="mt-1 text-sm text-gray-500">
            Click on the arrow to see key account distribution for each department
          </p>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          ) : enrichedDepartments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Budget
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrichedDepartments.map(dept => {
                    const isExpanded = expandedDepartments[dept.id];
                    const sortedAccounts = getSortedAccounts(dept.id);
                    const hasAccountData = sortedAccounts.length > 0;
                    
                    return (
                      <React.Fragment key={dept.id}>
                        <tr className={isExpanded ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <button 
                              onClick={() => toggleDepartmentExpand(dept.id)}
                              className={`mr-2 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            {dept.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dept.description || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(dept.totalBudget)}
                          </td>
                        </tr>
                        
                        {/* Expandable key account distribution section */}
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan="4" className="px-8 py-4">
                              <div className="border-l-4 border-indigo-400 pl-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Key Account Distribution</h4>
                                
                                {hasAccountData ? (
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Account ID
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Account Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Amount
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          % of Total
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {sortedAccounts.map((account, index) => {
                                        const percentage = dept.totalBudget > 0 
                                          ? (account.amount / dept.totalBudget) * 100 
                                          : 0;
                                        
                                        return (
                                          <tr key={`${dept.id}-${index}`} className="text-sm">
                                            <td className="px-4 py-2 text-gray-900">{account.id}</td>
                                            <td className="px-4 py-2 text-gray-900">{account.name}</td>
                                            <td className="px-4 py-2 text-gray-600">{formatCurrency(account.amount)}</td>
                                            <td className="px-4 py-2">
                                              <div className="flex items-center">
                                                <div className="w-20 bg-gray-200 rounded-full h-1.5 mr-2">
                                                  <div 
                                                    className="h-1.5 rounded-full bg-indigo-500" 
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                  ></div>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                  {percentage.toFixed(1)}%
                                                </span>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-sm text-gray-500">No key account distribution data available for this department.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No departments found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentManagement;