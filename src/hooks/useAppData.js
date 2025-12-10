import { useQuery } from '@tanstack/react-query';
import { MockDataService } from '@/services/index.js';

/**
 * Custom Hook for App Data Management
 * Provides access to master data (countries, SKUs, months)
 */
export const useAppData = () => {
  const { data, isLoading: loading, error, refetch: refresh } = useQuery({
    queryKey: ['appData'],
    queryFn: async () => {
      return MockDataService.generateMockData();
    },
    staleTime: 1000 * 60 * 30, // Master data rarely changes - 30 minutes
  });

  return {
    data,
    loading,
    error: error?.message || null,
    refresh
  };
};

export default useAppData;
