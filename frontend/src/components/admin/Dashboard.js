// frontend/src/components/admin/Dashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import withdrawalService from '../../services/withdrawalService';
import departmentService from '../../services/departmentService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const AdminDashboard = () => {
  const { accountsWithUsage, getBudgetSummary } = useContext(KeyAccountContext);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState(null);
  const [dashboardData, setDashboardData] = useState({
    pendingRequests: [],
    departments:     0,
    pendingCount:    0,
    revisionCount:   0,
    totalBudget:     0,
    totalUsed:       0
  });
  const [topAccounts, setTopAccounts]     = useState([]);
  const [topDepartments, setTopDepartments] = useState([]);

  // 1) Fetch the core dashboard data once on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [pendingRequests, departments, budgetSummary] = await Promise.all([
          withdrawalService.getAllPendingRequests(),
          departmentService.getAllDepartments(),
          getBudgetSummary()
        ]);

        setDashboardData({
          pendingRequests: pendingRequests.slice(0, 5),
          departments:     departments.length,
          pendingCount:    pendingRequests.length,
          revisionCount:   0, // replace with real endpoint when available
          // safe-guard null summary:
          totalBudget: budgetSummary?.total_allocated ?? 0,
          totalUsed:   budgetSummary?.total_used     ?? 0
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [getBudgetSummary]);

  // 2) Recompute topAccounts whenever the raw data changes
  useEffect(() => {
    setTopAccounts(
      [...accountsWithUsage]
        .sort((a, b) => b.used_amount - a.used_amount)
        .slice(0, 5)
    );
  }, [accountsWithUsage]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 ml-64 flex justify-center items-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const usagePercentage = dashboardData.totalBudget > 0
    ? (dashboardData.totalUsed / dashboardData.totalBudget) * 100
    : 0;

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {error && <AlertMessage type="error" message={error} />}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card title="Pending Requests" value={dashboardData.pendingCount} link="/admin/withdrawals" />
        <Card title="Revision Requests" value={dashboardData.revisionCount} link="/admin/withdrawals" />
        <Card title="Departments" value={dashboardData.departments} link="/admin/departments" />
        <Card title="Total Budget" value={formatCurrency(dashboardData.totalBudget)} link="/admin/key-account-allocation" />
      </div>

      {/* Usage & Top Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <UsagePanel
          used={dashboardData.totalUsed}
          total={dashboardData.totalBudget}
          percentage={usagePercentage}
        />
        <TopAccountsPanel accounts={topAccounts} />
      </div>

      {/* Recent pending requests table */}
      <RecentRequestsTable requests={dashboardData.pendingRequests} />
    </div>
  );
};

// Helper sub-components to keep the file DRY

const Card = ({ title, value, link }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-medium text-gray-900 mb-2">{title}</h2>
    <p className="text-3xl font-bold text-indigo-600">{value}</p>
    <Link to={link} className="mt-3 text-sm text-indigo-600 block">
      View all
    </Link>
  </div>
);

const UsagePanel = ({ used, total, percentage }) => (
  <div className="bg-white rounded-lg shadow">
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-medium text-gray-900">Overall Budget Usage</h2>
    </div>
    <div className="p-6">
      <div className="flex justify-between mb-2">
        <span>Used: {formatCurrency(used)}</span>
        <span>Total: {formatCurrency(total)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className={`h-4 rounded-full ${
            percentage > 90 ? 'bg-red-500' :
            percentage > 70 ? 'bg-yellow-500' :
            'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="mt-2 text-right text-sm text-gray-500">
        {Math.round(percentage)}% used
      </div>
    </div>
  </div>
);

const TopAccountsPanel = ({ accounts }) => (
  <div className="bg-white rounded-lg shadow">
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-medium text-gray-900">Top Accounts by Usage</h2>
    </div>
    <div className="p-6 space-y-4">
      {accounts.length
        ? accounts.map(acc => {
            const pct = acc.total_budget
              ? (acc.used_amount / acc.total_budget) * 100
              : 0;
            return (
              <div key={acc.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-gray-800">
                    {acc.account_type}: {acc.name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(acc.used_amount)} / {formatCurrency(acc.total_budget)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      pct > 90 ? 'bg-red-500' :
                      pct > 70 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        : <p className="text-gray-500">No account usage data available.</p>}
      <div className="mt-4">
        <Link to="/admin/key-accounts" className="text-indigo-600 hover:underline">
          Manage key accounts →
        </Link>
      </div>
    </div>
  </div>
);

const RecentRequestsTable = ({ requests }) => (
  <div className="bg-white rounded-lg shadow">
    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
      <h2 className="text-lg font-medium text-gray-900">Recent Pending Withdrawal Requests</h2>
      <Link to="/admin/withdrawals" className="text-indigo-600 hover:underline">View all</Link>
    </div>
    <div className="p-6 overflow-x-auto">
      {requests.length ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Date','User','Dept','Account','Amount','Actions'].map(h => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.requester_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.department_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.account_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(r.amount)}</td>
                <td className="px-6 py-4 text-sm">
                  <Link
                    to={`/admin/withdrawals/${r.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">No pending withdrawal requests found.</p>
      )}
    </div>
  </div>
);

export default AdminDashboard;
