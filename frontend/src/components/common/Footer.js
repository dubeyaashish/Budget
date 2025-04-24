import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Budget Allocation System</h3>
            <p className="text-sm text-gray-400">Manage your departmental budgets efficiently</p>
          </div>
          <div className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} All rights reserved
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;