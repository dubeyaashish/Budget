import React, { useEffect, useState } from 'react';

const AlertMessage = ({ type, message }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [message]);

  if (!isVisible) return null;

  const getAlertClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info':
      default:
        return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  return (
    <div className={`border-l-4 p-4 rounded ${getAlertClasses()}`} role="alert">
      <p>{message}</p>
      <button 
        className="absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700"
        onClick={() => setIsVisible(false)}
      >
        &times;
      </button>
    </div>
  );
};

export default AlertMessage;
