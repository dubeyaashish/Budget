// frontend/src/context/KeyAccountContext.js
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import keyAccountService from '../services/keyAccountService';

export const KeyAccountContext = createContext();

export const KeyAccountProvider = ({ children }) => {
  const [keyAccounts, setKeyAccounts] = useState([]);
  const [accountsWithUsage, setAccountsWithUsage] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch key accounts and their usage
  const fetchKeyAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const accounts = await keyAccountService.getAllKeyAccounts();
      setKeyAccounts(accounts);

      const usage = await keyAccountService.getKeyAccountsWithUsage();
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

      const summary = await keyAccountService.getBudgetSummary();
      return summary;
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

      const spending = await keyAccountService.getDepartmentSpendingByAccount(accountId);
      return spending;
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

      const spending = await keyAccountService.getAccountSpendingByDepartment(departmentId);
      return spending;
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
