import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Sidebar = () => {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();

  // Hide sidebar if not logged in or on auth pages
  if (!currentUser) return null;
  const authPaths = ['/login', '/register'];
  if (authPaths.includes(location.pathname)) return null;

  // Determine admin vs user links
  const isAdmin = currentUser.role === 'admin';

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/admin/key-accounts', label: 'Key Accounts', icon: 'money-bill' },
    { to: '/admin/key-account-allocation', label: 'Budget Allocation', icon: 'wallet' },
    { to: '/admin/credit', label: 'Credit Requests', icon: 'file-invoice-dollar' },
    { to: '/admin/departments', label: 'Departments', icon: 'building' },
    { to: '/admin/budget-limits', label: 'Budget Limits', icon: 'chart-pie' },
    { to: '/admin/users', label: 'User Management', icon: 'users' },
    { to: '/admin/reports/departments', label: 'Spending Reports', icon: 'chart-bar' }
  ];

  const userLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/new-credit', label: 'New Credit', icon: 'plus-circle' },
    { to: '/credit-history', label: 'Credit History', icon: 'history' },
    { to: '/revision-requests', label: 'Revision Requests', icon: 'edit' }
  ];

  const links = isAdmin ? adminLinks : userLinks;

  const getIconClass = (icon) => {
    switch (icon) {
      case 'home': return 'fas fa-home';
      case 'building': return 'fas fa-building';
      case 'money-bill': return 'fas fa-money-bill-wave';
      case 'wallet': return 'fas fa-wallet';
      case 'file-invoice-dollar': return 'fas fa-file-invoice-dollar';
      case 'users': return 'fas fa-users';
      case 'plus-circle': return 'fas fa-plus-circle';
      case 'history': return 'fas fa-history';
      case 'edit': return 'fas fa-edit';
      case 'chart-pie': return 'fas fa-chart-pie';
      case 'chart-bar': return 'fas fa-chart-bar';
      default: return 'fas fa-link';
    }
  };

  return (
    <div className="h-screen bg-gray-800 text-white w-64 fixed left-0 top-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Budget Allocation</h2>
        <p className="text-gray-400 text-sm mt-1">
          {isAdmin ? 'Admin Panel' : 'User Panel'}
        </p>
      </div>
      
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-xl font-bold">
            {(currentUser.name?.charAt(0) || '') + (currentUser.surname?.charAt(0) || '')}
          </div>
          <div className="ml-3">
            <p className="font-medium">{currentUser.name} {currentUser.surname}</p>
            <p className="text-sm text-gray-400">{isAdmin ? 'Administrator' : 'User'}</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`flex items-center p-2 rounded-md transition-colors ${
                  location.pathname === link.to
                    ? 'bg-indigo-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}>
                <span className={`${getIconClass(link.icon)} w-5 h-5 mr-3`} />
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
