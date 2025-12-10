import React, { createContext, useContext } from 'react';
import { useAppData } from '../hooks/index.js';

/**
 * App Context
 * Provides access to master data only
 * Business logic is handled by individual hooks
 */
const AppContext = createContext();

/**
 * Custom hook to use app context
 */
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

/**
 * App Provider Component
 * Provides master data (countries, SKUs, months) to the application
 * All business logic is handled by custom hooks
 */
export const AppProvider = ({ children }) => {
  const { data, loading, error, refresh } = useAppData();

  const value = {
    // Master data
    data,
    loading,
    error,
    refresh
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;

