import { useState, useEffect, useCallback } from 'react';
import { MockDataService } from '../services/index.js';

/**
 * Custom Hook for App Data Management
 * Provides access to master data (countries, SKUs, months)
 */
export const useAppData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load app data
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const mockData = MockDataService.generateMockData();
      setData(mockData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading app data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Refresh data
   */
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refresh
  };
};

export default useAppData;

