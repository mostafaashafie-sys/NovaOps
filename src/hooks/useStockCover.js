import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StockCoverService } from '@/services/index.js';

/**
 * Custom Hook for Stock Cover Management
 * Separates UI from service layer
 */
export const useStockCover = (countryId = null) => {
  const queryClient = useQueryClient();

  const { data: stockCoverData = {}, isLoading: loading, error } = useQuery({
    queryKey: ['stockCover', countryId],
    queryFn: async () => {
      if (countryId) {
        return await StockCoverService.getStockCoverData(countryId);
      } else {
        return await StockCoverService.getAllStockCoverData();
      }
    },
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
