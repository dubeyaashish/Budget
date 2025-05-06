// frontend/src/context/KeyAccountContext.js
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import keyAccountService from '../services/keyAccountService';

export const KeyAccountContext = createContext();

export const KeyAccountProvider = ({ children }) => {
  const [keyAccounts, setKeyAccounts] = useState([]);
  const [accountsWithUsage, setAccountsWithUsage] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

// In KeyAccountContext.js, update fetchKeyAccounts:
// Updated fetch function in KeyAccountContext.js
const fetchKeyAccounts = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);

    const [accountsResponse, usageResponse] = await Promise.all([
      keyAccountService.getAllKeyAccounts(),
      keyAccountService.getKeyAccountsWithUsage()
    ]);

    console.log('Accounts raw response:', accountsResponse); // Debug log
    console.log('Usage raw response:', usageResponse); // Debug log

    // Handle both data formats - direct array or nested in data property
    const accounts = Array.isArray(accountsResponse) ? accountsResponse : 
                    (accountsResponse && accountsResponse.data) ? accountsResponse.data : [];
    
    const usage = Array.isArray(usageResponse) ? usageResponse : 
                 (usageResponse && usageResponse.data) ? usageResponse.data : [];

    if (accounts.length === 0) {
      console.warn('No key accounts received from API');
    }

    setKeyAccounts(accounts);
    setAccountsWithUsage(usage);
  } catch (err) {
    console.error('Error fetching key accounts:', err);
    setError(err.response?.data?.message || 'Failed to fetch key accounts');
  } finally {
    setIsLoading(false);
  }
}, []);

  useEffect(() => {
    fetchKeyAccounts();
  }, [fetchKeyAccounts]);

  // Create or update a key account, then refresh list
  const upsertKeyAccount = useCallback(async (accountData) => {
    try {
      setIsLoading(true);
      setError(null);

      await keyAccountService.upsertKeyAccount(accountData);
      await fetchKeyAccounts();
      return true;
    } catch (err) {
      console.error('Error saving key account:', err);
      setError(err.response?.data?.message || 'Failed to save key account');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchKeyAccounts]);

  // Fetch overall budget summary
  const getBudgetSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const summaryResponse = await keyAccountService.getBudgetSummary();
      return summaryResponse.data;
    } catch (err) {
      console.error('Error fetching budget summary:', err);
      setError(err.response?.data?.message || 'Failed to fetch budget summary');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch spending breakdown for a specific account
  const getDepartmentSpending = useCallback(async (accountId) => {
    try {
      setIsLoading(true);
      setError(null);

      const spendingResponse = await keyAccountService.getDepartmentSpendingByAccount(accountId);
      return spendingResponse.data;
    } catch (err) {
      console.error('Error fetching department spending:', err);
      setError(err.response?.data?.message || 'Failed to fetch department spending');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch accounts spending by department
  const getAccountSpendingByDepartment = useCallback(async (departmentId) => {
    try {
      setIsLoading(true);
      setError(null);

      const spendingResponse = await keyAccountService.getAccountSpendingByDepartment(departmentId);
      return spendingResponse.data;
    } catch (err) {
      console.error('Error fetching account spending by department:', err);
      setError(err.response?.data?.message || 'Failed to fetch account spending');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Group key accounts by type
  const groupedAccounts = useMemo(() => {
    return keyAccounts.reduce((acc, account) => {
      if (!acc[account.account_type]) acc[account.account_type] = [];
      acc[account.account_type].push(account);
      return acc;
    }, {});
  }, [keyAccounts]);

  // Memoize context value to prevent unnecessary rerenders
  const value = useMemo(() => ({
    keyAccounts,
    accountsWithUsage,
    groupedAccounts,
    isLoading,
    error,
    fetchKeyAccounts,
    upsertKeyAccount,
    getBudgetSummary,
    getDepartmentSpending,
    getAccountSpendingByDepartment,
    setError
  }), [
    keyAccounts,
    accountsWithUsage,
    groupedAccounts,
    isLoading,
    error,
    fetchKeyAccounts,
    upsertKeyAccount,
    getBudgetSummary,
    getDepartmentSpending,
    getAccountSpendingByDepartment
  ]);

  return (
    <KeyAccountContext.Provider value={value}>
      {children}
    </KeyAccountContext.Provider>
  );
};