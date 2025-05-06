// Updated frontend/src/components/admin/KeyAccountManagement.js
import React, { useState, useEffect, useContext } from 'react';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import creditService from '../../services/creditService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';
import { exportToExcel } from '../../utils/excelExport';

const KeyAccountManagement = () => {
  const { keyAccounts, accountsWithUsage, isLoading: accountsLoading, error: accountsError, fetchKeyAccounts } = useContext(KeyAccountContext);
  
  const [budgetData, setBudgetData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [accountTotals, setAccountTotals] = useState({});
  const [departmentByAccount, setDepartmentByAccount] = useState({});
  
  // Ensure data is refreshed when component mounts
  useEffect(() => {
    fetchKeyAccounts();
  }, [fetchKeyAccounts]);
  
  // Load budget master data
  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        setIsLoading(true);
        
        // Get budget master data
        const data = await creditService.getBudgetMasterData();
        console.log('Raw budget data:', data);
        setBudgetData(Array.isArray(data) ? data : []);
        
        // Process data for account totals and department distribution
        const totals = {};
        const deptDistribution = {};
        
        // Make sure we're working with an array
        const dataArray = Array.isArray(data) ? data : [];
        
        dataArray.forEach(item => {
          // Skip entries with no key_account or amount
          if (!item.key_account || item.amount === undefined) return;
          
          const accountId = item.key_account;
          const amount = parseFloat(item.amount) || 0;
          const deptName = item.department_name || `Department ${item.department}`;
          
          // Sum up totals by account
          if (!totals[accountId]) {
            totals[accountId] = 0;
          }
          totals[accountId] += amount;
          
          // Track department distribution
          if (!deptDistribution[accountId]) {
            deptDistribution[accountId] = {};
          }
          if (!deptDistribution[accountId][deptName]) {
            deptDistribution[accountId][deptName] = 0;
          }
          deptDistribution[accountId][deptName] += amount;
        });
        
        console.log('Account totals:', totals);
        console.log('Department distribution:', deptDistribution);
        
        setAccountTotals(totals);
        setDepartmentByAccount(deptDistribution);
      } catch (err) {
        console.error('Error fetching budget data:', err);
        setError('Failed to load budget data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBudgetData();
  }, []);
  
  // Toggle account expansion
  const toggleAccountExpand = (accountId) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };
  
  // Get enriched account data with totals
  const getEnrichedAccounts = () => {
    // Ensure keyAccounts is treated as an array
    const accountsArray = Array.isArray(keyAccounts) ? keyAccounts : 
                         (keyAccounts && keyAccounts.data && Array.isArray(keyAccounts.data)) ? keyAccounts.data : [];
    
    if (accountsArray.length === 0) {
      console.warn('No key accounts found in:', keyAccounts);
    }
    
    return accountsArray.map(account => ({
      ...account,
      totalBudget: accountTotals[account.id] || 0
    }))
    // Sort by total budget (highest first)
    .sort((a, b) => b.totalBudget - a.totalBudget);
  };
  
  // Sort departments by amount for an account
  const getSortedDepartments = (accountId) => {
    if (!departmentByAccount[accountId]) return [];
    
    return Object.entries(departmentByAccount[accountId])
      .map(([dept, amount]) => ({ name: dept, amount }))
      .sort((a, b) => b.amount - a.amount);
  };
  
  // Export all key accounts data to Excel, including all department distributions
  const exportKeyAccountsData = () => {
    const enrichedAccounts = getEnrichedAccounts();
    
    if (enrichedAccounts.length === 0) {
      setError('No key accounts data to export');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      // Create two datasets: one for accounts and one for department distributions
      const accountsData = enrichedAccounts.map(account => ({
        ID: account.id,
        Name: account.name,
        Type: account.account_type || 'Not specified',
        TotalBudget: account.totalBudget || 0,
        // Get usage data if available
        UsedAmount: accountsWithUsage.find(a => a.id === account.id)?.used_amount || 0,
        AvailableAmount: accountsWithUsage.find(a => a.id === account.id)?.available_amount || 0,
      }));

      const accountsColumns = [
        { header: 'ID', key: 'ID', width: 15 },
        { header: 'Account Name', key: 'Name', width: 30 },
        { header: 'Account Type', key: 'Type', width: 20 },
        { header: 'Total Budget', key: 'TotalBudget', width: 15 },
        { header: 'Used Amount', key: 'UsedAmount', width: 15 },
        { header: 'Available Amount', key: 'AvailableAmount', width: 15 }
      ];

      // Prepare the department distribution data
      let allDepartmentData = [];
      
      enrichedAccounts.forEach(account => {
        const departments = getSortedDepartments(account.id);
        
        if (departments.length > 0) {
          const deptsForAccount = departments.map(dept => ({
            AccountID: account.id,
            AccountName: account.name,
            AccountType: account.account_type || 'Not specified',
            Department: dept.name,
            Amount: dept.amount || 0,
            Percentage: account.totalBudget > 0 
              ? ((dept.amount / account.totalBudget) * 100).toFixed(2)
              : 0
          }));
          
          allDepartmentData = [...allDepartmentData, ...deptsForAccount];
        }
      });

      const departmentColumns = [
        { header: 'Account ID', key: 'AccountID', width: 15 },
        { header: 'Account Name', key: 'AccountName', width: 30 },
        { header: 'Account Type', key: 'AccountType', width: 20 },
        { header: 'Department', key: 'Department', width: 30 },
        { header: 'Amount', key: 'Amount', width: 15 },
        { header: 'Percentage', key: 'Percentage', width: 15 }
      ];

      // Create a workbook with multiple sheets using a custom helper function
      const success = exportMultipleSheets([
        { name: 'Key Accounts', data: accountsData, columns: accountsColumns },
        { name: 'Department Distributions', data: allDepartmentData, columns: departmentColumns }
      ], 'Key_Accounts_Complete');

      if (success) {
        setSuccess('Key accounts data exported successfully with all department distributions!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to export key accounts data');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error exporting key accounts data:', error);
      setError('Error exporting data: ' + error.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Helper function to export multiple sheets in a single Excel file
  const exportMultipleSheets = (sheets, fileName) => {
    try {
      // Load the xlsx library
      const XLSX = require('xlsx');
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Add each sheet to the workbook
      sheets.forEach(sheet => {
        if (!sheet.data || sheet.data.length === 0) return;
        
        let ws;
        
        if (sheet.columns) {
          // Create worksheet from array of objects with specific columns
          const wsData = [
            // Header row
            sheet.columns.map(col => col.header),
            // Data rows
            ...sheet.data.map(item => 
              sheet.columns.map(col => {
                // Handle nested properties with dot notation
                if (col.key.includes('.')) {
                  const keys = col.key.split('.');
                  let value = item;
                  for (const key of keys) {
                    value = value?.[key];
                    if (value === undefined) break;
                  }
                  return value ?? '';
                }
                return item[col.key] ?? '';
              })
            )
          ];
          
          ws = XLSX.utils.aoa_to_sheet(wsData);
          
          // Set column widths if provided
          if (sheet.columns.some(col => col.width)) {
            ws['!cols'] = sheet.columns.map(col => ({ wch: col.width || 10 }));
          }
        } else {
          // Create worksheet from array of objects using all properties
          ws = XLSX.utils.json_to_sheet(sheet.data);
        }
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, sheet.name || 'Sheet');
      });
      
      // Generate Excel file and trigger download
      XLSX.writeFile(wb, `${fileName}.xlsx`, { 
        bookType: 'xlsx',
        type: 'binary',
        bookSST: false,
        cellStyles: true
      });
      
      return true;
    } catch (error) {
      console.error('Error exporting multiple sheets:', error);
      return false;
    }
  };

  // Export departments for a specific account to Excel
  const exportAccountDepartments = (accountId, accountName) => {
    const departments = getSortedDepartments(accountId);
    
    if (departments.length === 0) {
      setError(`No department data found for account ${accountName}`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Format data for Excel export
    const exportData = departments.map(dept => ({
      Department: dept.name,
      Amount: dept.amount || 0,
      Percentage: accountTotals[accountId] > 0 
        ? ((dept.amount / accountTotals[accountId]) * 100).toFixed(2)
        : 0
    }));

    const columns = [
      { header: 'Department', key: 'Department', width: 30 },
      { header: 'Amount', key: 'Amount', width: 15 },
      { header: 'Percentage', key: 'Percentage', width: 15 }
    ];

    // Sanitize account name for filename
    const sanitizedName = accountName.replace(/[^a-zA-Z0-9ก-๙]/g, '_');
    const success = exportToExcel(
      exportData, 
      `Account_${sanitizedName}_Departments`, 
      columns
    );

    if (success) {
      setSuccess(`Department data for ${accountName} exported successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(`Failed to export department data for ${accountName}`);
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Combined loading state
  const isPageLoading = isLoading || accountsLoading;
  
  // Combined error state
  const pageError = error || accountsError;
  
  const enrichedAccounts = getEnrichedAccounts();
  
  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Key Account Management</h1>
      
      {pageError && <AlertMessage type="error" message={pageError} />}
      {success && <AlertMessage type="success" message={success} />}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Key Accounts</h2>
              <p className="mt-1 text-sm text-gray-500">
                Click on the arrow to see department distribution for each account
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={fetchKeyAccounts}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Refresh Data
              </button>
              <button 
                onClick={exportKeyAccountsData}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Export to Excel
              </button>
            </div>
          </div>
          {enrichedAccounts.length === 0 && (
            <div className="mt-2 text-sm text-yellow-500">
              No key accounts found. Make sure key_accounts table has data.
            </div>
          )}
        </div>
        
        <div className="p-6">
          {isPageLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          ) : enrichedAccounts.length > 0 ? (
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
                      Account Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Budget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrichedAccounts.map(account => {
                    const isExpanded = expandedAccounts[account.id];
                    const sortedDepts = getSortedDepartments(account.id);
                    const hasDeptData = sortedDepts.length > 0;
                    
                    return (
                      <React.Fragment key={account.id}>
                        <tr className={isExpanded ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <button 
                              onClick={() => toggleAccountExpand(account.id)}
                              className={`mr-2 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            {account.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {account.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {account.account_type || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(account.totalBudget)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasDeptData && (
                              <button
                                onClick={() => exportAccountDepartments(account.id, account.name)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                              >
                                Export Departments
                              </button>
                            )}
                          </td>
                        </tr>
                        
                        {/* Expandable department distribution section */}
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan="5" className="px-8 py-4">
                              <div className="border-l-4 border-indigo-400 pl-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Department Distribution</h4>
                                
                                {hasDeptData ? (
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Department
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
                                      {sortedDepts.map((dept, index) => {
                                        const percentage = account.totalBudget > 0 
                                          ? (dept.amount / account.totalBudget) * 100 
                                          : 0;
                                        
                                        return (
                                          <tr key={`${account.id}-${index}`} className="text-sm">
                                            <td className="px-4 py-2 text-gray-900">{dept.name}</td>
                                            <td className="px-4 py-2 text-gray-600">{formatCurrency(dept.amount)}</td>
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
                                  <p className="text-sm text-gray-500">No department distribution data available for this account.</p>
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
            <p className="text-gray-500">No key accounts found or no budget data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyAccountManagement;