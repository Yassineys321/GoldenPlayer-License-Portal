import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const addAlert = useCallback((message, type = 'info', title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    
    // Set default titles based on type if not provided
    let defaultTitle = title;
    if (!title) {
      if (type === 'success') defaultTitle = 'Success';
      else if (type === 'error') defaultTitle = 'Error';
      else if (type === 'warning') defaultTitle = 'Attention';
      else defaultTitle = 'System Alert';
    }

    setAlerts((prev) => [...prev, { id, message, type, title: defaultTitle }]);
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const success = useCallback((message, title = '') => addAlert(message, 'success', title), [addAlert]);
  const error = useCallback((message, title = '') => addAlert(message, 'error', title), [addAlert]);
  const warning = useCallback((message, title = '') => addAlert(message, 'warning', title), [addAlert]);
  const info = useCallback((message, title = '') => addAlert(message, 'info', title), [addAlert]);

  return (
    <AlertContext.Provider value={{ success, error, warning, info, showAlert: addAlert }}>
      {children}
      
      {/* Toast Portal/Container */}
      <div className="toast-container">
        <AnimatePresence>
          {alerts.map((alert) => (
            <ToastCard
              key={alert.id}
              alert={alert}
              onClose={() => removeAlert(alert.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </AlertContext.Provider>
  );
};

const ToastCard = ({ alert, onClose }) => {
  const { id, message, type, title } = alert;

  // Render matching icon
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
    }
  };

  // Automatically close toast after 5 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(4px)' }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        filter: 'blur(0px)',
        transition: { type: 'spring', stiffness: 350, damping: 25 }
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.85, 
        filter: 'blur(4px)',
        y: -10, 
        transition: { duration: 0.2 } 
      }}
      className={`toast-card ${type}`}
    >
      <div className="toast-icon-container">
        {getIcon()}
      </div>
      
      <div className="toast-content">
        <div className="toast-title">{title}</div>
        <div className="toast-message">{message}</div>
      </div>
      
      <button className="toast-close-btn" onClick={onClose} aria-label="Close message">
        <X size={15} />
      </button>

      {/* Expiry progress bar */}
      <motion.div 
        className="toast-progress" 
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 5, ease: 'linear' }}
      />
    </motion.div>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
