import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/providers/index.js';
import { DataverseDataService } from '@/services/index.js';

/**
 * Custom Hook to Get SKUs Filtered by Country Assignment
 * When a countryId is provided, only returns SKUs that are assigned to that country
 * When no countryId is provided, returns all SKUs (for backward compatibility)
 * 
 * @param {string|null} countryId - Country ID to filter SKUs by. If null/undefined, returns all SKUs.
 * @returns {Object} - { skus: Array, loading: boolean, error: string|null }
 */
export const useSkusByCountry = (countryId = null) => {
  const { data: appData } = useApp(); // Get cached SKUs from AppProvider
  
  const { data: skuCountryAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['skuCountryAssignments', countryId],
    queryFn: async () => {
      if (!countryId) {
        return []; // No country selected, return empty array
      }
      
      // Fetch SKU country assignments for this country
      const assignments = await DataverseDataService.getSkuCountryAssignments({ 
        countryId 
      });
      
      // Extract SKU IDs from assignments
      // Assignments have _new_sku_value or skuId field
      return Array.isArray(assignments) ? assignments : [];
    },
    enabled: !!countryId, // Only fetch when countryId is provided
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Filter SKUs based on country assignments
  const filteredSkus = useMemo(() => {
    if (!appData?.skus) {
      return [];
    }

    // If no country is selected, return all SKUs
    if (!countryId || !skuCountryAssignments || skuCountryAssignments.length === 0) {
      return appData.skus;
    }

    // Create a Set of SKU IDs that are assigned to this country
    const assignedSkuIds = new Set();
    skuCountryAssignments.forEach(assignment => {
      // Try multiple ways to get SKU ID:
      // 1. From expanded SKU lookup (if expanded)
      // 2. From skuId field (if transformed)
      // 3. From _new_sku_value (raw Dataverse field)
      const skuId = assignment.sku?.id || assignment.skuId || assignment._new_sku_value;
      if (skuId) {
        assignedSkuIds.add(skuId);
      }
    });

    // Filter SKUs to only include those assigned to the country
    return appData.skus.filter(sku => assignedSkuIds.has(sku.id));
  }, [appData?.skus, countryId, skuCountryAssignments]);

  return {
    skus: filteredSkus,
    loading: assignmentsLoading || appData?.loading || false,
    error: null
  };
};

export default useSkusByCountry;

