// frontend/src/context/KeyAccountContext.js
import React, { createContext, useState, useEffect } from 'react';
import keyAccountService from '../services/keyAccountService';

export const KeyAccountContext = createContext();

export const KeyAccountProvider = ({ children }) => {
  const [keyAccounts, setKeyAccounts] = useState([]);
  const [accountsWithUsage, setAccountsWithUsage] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchKeyAccounts();
  }, []);

  const fetchKeyAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const accounts = await keyAccountService.getAllKeyAccounts();
      setKeyAccounts(accounts);
      
      // Also fetch accounts with usage data
      const usage = await keyAccountService.getKeyAccountsWithUsage();
      setAccountsWithUsage(usage);
    } catch (err) {
      console.error('Error fetching key accounts:', err);
      setError(err.response?.data?.message || 'Failed to fetch key accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const upsertKeyAccount = async (accountData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await keyAccountService.upsertKeyAccount(accountData);
      
      // Refresh the accounts list
      fetchKeyAccounts();
      
      return true;
    } catch (err) {
      console.error('Error saving key account:', err);
      setError(err.response?.data?.message || 'Failed to save key account');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getBudgetSummary = async () => {
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
  };

  const getDepartmentSpending = async (accountId) => {
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
  };

  const getAccountSpendingByDepartment = async (departmentId) => {
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
  };

  // Group accounts by account type
  const groupedAccounts = keyAccounts.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    
    acc[account.account_type].push(account);
    return acc;
  }, {});

  return (
    <KeyAccountContext.Provider
      value={{
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
      }}
    >
      {children}
    </KeyAccountContext.Provider>
  );
};