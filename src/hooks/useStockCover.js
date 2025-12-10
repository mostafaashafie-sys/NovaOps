import { useState, useEffect, useCallback } from 'react';
import { StockCoverService } from '../services/index.js';

/**
 * Custom Hook for Stock Cover Management
 * Separates UI from service layer
 */
export const useStockCover = (countryId = null) => {
  const [stockCoverData, setStockCoverData] = useState({});
  const [allStockCoverData, setAllStockCoverData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load stock cover data
   */
  const loadStockCoverData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (countryId) {
        const data = await StockCoverService.getStockCoverData(countryId);
        setStockCoverData(data);
      } else {
        const data = await StockCoverService.getAllStockCoverData();
        setAllStockCoverData(data);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading stock cover data:', err);
    } finally {
      setLoading(false);
    }
  }, [countryId]);

  useEffect(() => {
    loadStockCoverData();
  }, [loadStockCoverData]);

  /**
   * Update planned quantity
   */
  const updatePlannedQty = useCallback(async (countryIdParam, skuId, monthKey, newValue) => {
    try {
      setError(null);
      const updated = await StockCoverService.updatePlannedQty(countryIdParam, skuId, monthKey, newValue);
      
      // Update local state
      if (countryIdParam) {
        setStockCoverData(prev => {
          const newData = { ...prev };
          if (newData[skuId]?.months[monthKey]) {
            newData[skuId].months[monthKey] = { ...newData[skuId].months[monthKey], ...updated };
          }
          return newData;
        });
      } else {
        setAllStockCoverData(prev => {
          const newData = { ...prev };
          if (newData[countryIdParam]?.[skuId]?.months[monthKey]) {
            newData[countryIdParam][skuId].months[monthKey] = { ...newData[countryIdParam][skuId].months[monthKey], ...updated };
          }
          return newData;
        });
      }
      
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Calculate months cover
   */
  const calculateMonthsCover = useCallback(async (countryId, skuId) => {
    try {
      setError(null);
      return await StockCoverService.calculateMonthsCover(countryId, skuId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Refresh stock cover data
   */
  const refresh = useCallback(() => {
    loadStockCoverData();
  }, [loadStockCoverData]);

  return {
    stockCoverData: countryId ? stockCoverData : allStockCoverData,
    loading,
    error,
    updatePlannedQty,
    calculateMonthsCover,
    refresh
  };
};

export default useStockCover;

