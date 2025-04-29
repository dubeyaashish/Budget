import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { KeyAccountContext } from '../../context/KeyAccountContext';
import withdrawalService from '../../services/creditService';
import departmentService from '../../services/departmentService';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertMessage from '../common/AlertMessage';
import { formatCurrency } from '../../utils/formatCurrency';

const AdminDashboard = () => {
  const { accountsWithUsage } = useContext(KeyAccountContext);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    pendingRequests: [],
    departments: 0,
    pendingCount: 0,
    revisionCount: 0
  });
  const [topAccounts, setTopAccounts] = useState([]);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [pendingRequests, departments] = await Promise.all([
        withdrawalService.getAllPendingRequests(),
        departmentService.getAllDepartments()
      ]);

      // Normalize pendingRequests to ensure it's an array
      const normalizedPendingRequests = Array.isArray(pendingRequests) ? pendingRequests : [];

      setDashboardData({
        pendingRequests: normalizedPendingRequests.slice(0, 5),
        departments: Array.isArray(departments) ? departments.length : 0,
        pendingCount: normalizedPendingRequests.length,
        revisionCount: 0 // TODO: hook up real revision count endpoint
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load some dashboard data. Partial data displayed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On mount, load dashboard
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Recompute top accounts whenever usage changes
  useEffect(() => {
    const sorted = [...accountsWithUsage]
      .sort((a, b) => (b.used_amount || 0) - (a.used_amount || 0))
      .slice(0, 5);
    setTopAccounts(sorted);
  }, [accountsWithUsage]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 ml-64 flex justify-center items-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const { pendingCount, pendingRequests, departments, revisionCount } = dashboardData;

  return (
    <div className="flex-1 p-8 ml-64">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {error && <AlertMessage type="warning" message={error} />}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card title="Pending Requests" value={pendingCount} link="/admin/withdrawals" />
        <Card title="Revision Requests" value={revisionCount} link="/admin/withdrawals" />
        <Card title="Departments" value={departments} link="/admin/departments" />
      </div>

      {/* Top Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
        <TopAccountsPanel accounts={topAccounts} />
      </div>

      {/* Recent pending requests */}
      <RecentRequestsTable requests={pendingRequests} />
    </div>
  );
};

// --- Helper components ---

function Card({ title, value, link }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-2">{title}</h2>
      <p className="text-3xl font-bold text-indigo-600">{value}</p>
      <Link to={link} className="mt-3 text-sm text-indigo-600 block">
        View all
      </Link>
    </div>
  );
}

function TopAccountsPanel({ accounts }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Top Accounts by Usage</h2>
      </div>
      <div className="p-6 space-y-4">
        {accounts.length > 0 ? (
          accounts.map(acc => {
            const pct = acc.total_budget ? (acc.used_amount / acc.total_budget) * 100 : 0;
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
                      pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500">No account usage data available.</p>
        )}
        <div className="mt-4">
          <Link to="/admin/key-accounts" className="text-indigo-600 hover:underline">
            Manage key accounts →
          </Link>
        </div>
      </div>
    </div>
  );
}

function RecentRequestsTable({ requests }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Recent Pending Withdrawal Requests</h2>
        <Link to="/admin/withdrawals" className="text-indigo-600 hover:underline">
          View all
        </Link>
      </div>
      <div className="p-6 overflow-x-auto">
        {Array.isArray(requests) && requests.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'User', 'Dept', 'Account', 'Amount', 'Actions'].map(h => (
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
                    {new Date(r.created_at).toLocaleDateString('en-GB')}
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
}

export default AdminDashboard;