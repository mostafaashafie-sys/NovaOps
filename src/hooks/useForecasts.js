import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ForecastService } from '@/services/index.js';

/**
 * Custom Hook for Forecast Management
 * Separates UI from service layer
 */
export const useForecasts = (initialFilters = {}) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState(initialFilters);

  const { data: forecasts = [], isLoading: loading, error } = useQuery({
    queryKey: ['forecasts', filters],
    queryFn: () => ForecastService.getForecasts(filters),
  });

  const getForecastsBySKU = async () => {
    try {
      return await ForecastService.getForecastsBySKU(filters);
    } catch (err) {
      throw err;
    }
  };

  const updateForecastMutation = useMutation({
    mutationFn: ({ forecastId, data }) => 
      ForecastService.updateForecast(forecastId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['forecasts'] });
  };

  return {
    forecasts,
    loading,
    error: error?.message || null,
    filters,
    setFilters,
    getForecastsBySKU,
    updateForecast: (forecastId, data) => 
      updateForecastMutation.mutateAsync({ forecastId, data }),
    refresh
  };
};

export default useForecasts;
