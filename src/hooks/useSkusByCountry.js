import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '@/providers/index.js';
import { DataverseDataService } from '@/services/index.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('useSkusByCountry');

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
  
  const { data: skuCountryAssignments, isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['skuCountryAssignments', countryId],
    queryFn: async () => {
      if (!countryId) {
        return []; // No country selected, return empty array
      }
      
      try {
        // Fetch SKU country assignments for this country
        const assignments = await DataverseDataService.getSkuCountryAssignments({ 
          countryId 
        });
        
        logger.debug('SKU country assignments fetched', {
          countryId,
          count: Array.isArray(assignments) ? assignments.length : 0
        });
        
        // Extract SKU IDs from assignments
        // Assignments have _new_sku_value or skuId field
        return Array.isArray(assignments) ? assignments : [];
      } catch (error) {
        logger.error('Error fetching SKU country assignments', {
          countryId,
          error: error.message
        });
        throw error; // Re-throw to let React Query handle it
      }
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
    if (!countryId) {
      return appData.skus;
    }

    // If no assignments found, return empty array (always filter by assignments)
    if (!skuCountryAssignments || skuCountryAssignments.length === 0) {
      logger.warn('No SKU country assignments found for country', {
        countryId,
        totalSkus: appData.skus.length
      });
      return [];
    }

    // Normalize GUIDs to lowercase for comparison (GUIDs can be case-insensitive but we want consistent matching)
    const normalizeGuid = (guid) => {
      if (!guid) return null;
      return String(guid).toLowerCase().trim();
    };

    // Create a Set of SKU IDs that are assigned to this country
    const assignedSkuIds = new Set();
    const extractedSkuIds = [];
    skuCountryAssignments.forEach((assignment, index) => {
      // Try multiple ways to get SKU ID:
      // 1. From expanded SKU lookup (new_SKU is the Dataverse navigation property name)
      // 2. From transformed sku field (if transformation happened)
      // 3. From skuId field (if transformed)
      // 4. From _new_sku_value (raw Dataverse field)
      const rawSkuId = assignment.new_SKU?.new_skutableid || assignment.sku?.id || assignment.skuId || assignment._new_sku_value;
      const normalizedSkuId = normalizeGuid(rawSkuId);
      
      extractedSkuIds.push({
        index,
        assignmentKeys: Object.keys(assignment),
        rawSkuId,
        normalizedSkuId,
        skuObject: assignment.sku,
        _new_sku_value: assignment._new_sku_value,
        skuIdField: assignment.skuId
      });
      
      if (normalizedSkuId) {
        assignedSkuIds.add(normalizedSkuId);
      }
    });

    // Normalize SKU IDs from appData for comparison
    const allAppDataSkuIds = new Set(appData.skus.map(s => normalizeGuid(s.id)));
    
    logger.debug('Extracting SKU IDs from country assignments', {
      countryId,
      assignmentCount: skuCountryAssignments.length,
      assignedSkuIdsCount: assignedSkuIds.size,
      totalSkus: appData.skus.length
    });

    // Filter SKUs to only include those assigned to the country
    const filtered = appData.skus.filter(sku => {
      const normalizedSkuId = normalizeGuid(sku.id);
      return assignedSkuIds.has(normalizedSkuId);
    });
    
    logger.debug('Filtered SKUs by country assignments', {
      countryId,
      assignmentCount: skuCountryAssignments.length,
      assignedSkuIdsCount: assignedSkuIds.size,
      totalSkus: appData.skus.length,
      filteredSkusCount: filtered.length
    });

    // Filter SKUs to only include those assigned to the country
    return filtered;
  }, [appData?.skus, countryId, skuCountryAssignments]);

  return {
    skus: filteredSkus,
    loading: assignmentsLoading || appData?.loading || false,
    error: assignmentsError ? assignmentsError.message : null
  };
};

export default useSkusByCountry;

