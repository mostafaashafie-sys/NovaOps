import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StockManagementService, StockCalculationService } from '@/services/index.js';
import { useApp } from '@/providers/index.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('useStockCover');

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
      
      logger.debug('Fetching stock cover data via CalculationOrchestrator', { countryId });
      const data = await StockManagementService.getStockCoverData(countryId, 0, true, cachedSkus);
      logger.debug('Stock cover data fetched and calculated via CalculationOrchestrator', {
        countryId,
        skuCount: Object.keys(data || {}).length,
        hasData: !!(data && Object.keys(data).length > 0),
        sampleSkuIds: Object.keys(data || {}).slice(0, 5)
      });
      return data || {};
    },
    // Only fetch when a country is selected
    enabled: !!countryId && !!countryId.trim(),
    // Cache data for 5 minutes to prevent duplicate fetches
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Don't refetch on mount - use cached data if available (prevents infinite loops)
    refetchOnMount: false,
    // Don't refetch on window focus to reduce API calls
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect to prevent duplicate fetches
    refetchOnReconnect: false,
  });

  const updatePlannedQtyMutation = useMutation({
    mutationFn: ({ countryIdParam, skuId, monthKey, newValue }) =>
      StockManagementService.updatePlannedQty(countryIdParam, skuId, monthKey, newValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockCover'] });
    },
  });

  const calculateMonthsCover = async (countryId, skuId, year = null, month = null) => {
    try {
      logger.debug('Calculating monthsCover via CalculationOrchestrator', { countryId, skuId, year, month });
      // Use CalculationOrchestrator for monthsCover calculation
      const context = { countryId, skuId };
      if (year && month) {
        context.year = year;
        context.month = month;
        context.monthKey = `${year}-${String(month).padStart(2, '0')}`;
      }
      const result = await StockCalculationService.executeMeasure('monthsCover', {}, context);
      logger.debug('MonthsCover calculated successfully', { countryId, skuId, result });
      return result;
    } catch (err) {
      logger.error('Error calculating monthsCover via CalculationOrchestrator', { countryId, skuId, error: err.message });
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
