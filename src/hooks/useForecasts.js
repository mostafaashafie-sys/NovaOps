import { useState, useEffect, useCallback } from 'react';
import { ForecastService } from '../services/index.js';

/**
 * Custom Hook for Forecast Management
 * Separates UI from service layer
 */
export const useForecasts = (initialFilters = {}) => {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  /**
   * Load forecasts with current filters
   */
  const loadForecasts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ForecastService.getForecasts(filters);
      setForecasts(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading forecasts:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadForecasts();
  }, [loadForecasts]);

  /**
   * Get forecasts grouped by SKU
   */
  const getForecastsBySKU = useCallback(async () => {
    try {
      setError(null);
      return await ForecastService.getForecastsBySKU(filters);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [filters]);

  /**
   * Update forecast
   */
  const updateForecast = useCallback(async (forecastId, data) => {
    try {
      setError(null);
      const updated = await ForecastService.updateForecast(forecastId, data);
      setForecasts(prev => prev.map(f => 
        f.id === forecastId ? updated : f
      ));
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Refresh forecasts
   */
  const refresh = useCallback(() => {
    loadForecasts();
  }, [loadForecasts]);

  return {
    forecasts,
    loading,
    error,
    filters,
    setFilters,
    getForecastsBySKU,
    updateForecast,
    refresh
  };
};

export default useForecasts;

