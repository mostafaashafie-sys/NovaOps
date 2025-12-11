import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StockCoverService } from '@/services/index.js';
import { useApp } from '@/providers/index.js';

/**
 * Custom Hook for Stock Cover Management
 * Separates UI from service layer
 */
export const useStockCover = (countryId = null) => {
  const queryClient = useQueryClient();
  const { data: appData } = useApp(); // Get cached SKUs from AppProvider

  const { data: stockCoverData = {}, isLoading: loading, error } = useQuery({
    queryKey: ['stockCover', countryId],
    queryFn: async () => {
      // Use cached SKUs from appData to avoid duplicate fetches
      const cachedSkus = appData?.skus || null;
      
      // Only fetch for a specific country - never fetch all countries
      if (!countryId) {
        return {};
      }
      
      console.log('Fetching stock cover data from Dataverse for country:', countryId);
      const data = await StockCoverService.getStockCoverData(countryId, 0, true, cachedSkus);
      console.log('Stock cover data fetched:', {
        countryId,
        skuCount: Object.keys(data || {}).length,
        sampleMonths: Object.values(data || {})[0]?.months ? Object.keys(Object.values(data)[0].months).slice(0, 5) : []
      });
      return data;
    },
    // Only fetch when a country is selected
    enabled: !!countryId && !!countryId.trim(),
    // Cache data for 5 minutes to prevent duplicate fetches
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Only refetch on mount if data is stale
    refetchOnMount: 'always',
    // Don't refetch on window focus to reduce API calls
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect to prevent duplicate fetches
    refetchOnReconnect: false,
  });

  const updatePlannedQtyMutation = useMutation({
    mutationFn: ({ countryIdParam, skuId, monthKey, newValue }) =>
      StockCoverService.updatePlannedQty(countryIdParam, skuId, monthKey, newValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockCover'] });
    },
  });

  const calculateMonthsCover = async (countryId, skuId) => {
    try {
      return await StockCoverService.calculateMonthsCover(countryId, skuId);
    } catch (err) {
      throw err;
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stockCover'] });
  };

  return {
    stockCoverData,
    loading,
    error: error?.message || null,
    updatePlannedQty: (countryIdParam, skuId, monthKey, newValue) =>
      updatePlannedQtyMutation.mutateAsync({ countryIdParam, skuId, monthKey, newValue }),
    calculateMonthsCover,
    refresh
  };
};

export default useStockCover;
