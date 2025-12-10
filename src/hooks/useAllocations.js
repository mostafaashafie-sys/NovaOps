import { useState, useEffect, useCallback } from 'react';
import { AllocationService } from '../services/index.js';

/**
 * Custom Hook for Allocation Management
 * Separates UI from service layer
 */
export const useAllocations = (initialFilters = {}) => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  /**
   * Load allocations with current filters
   */
  const loadAllocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AllocationService.getAllocations(filters);
      setAllocations(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading allocations:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  /**
   * Create allocation
   */
  const createAllocation = useCallback(async (data) => {
    try {
      setError(null);
      const newAllocation = await AllocationService.createAllocation(data);
      setAllocations(prev => [...prev, newAllocation]);
      return newAllocation;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Allocate order item (full or partial with push/remove options)
   * @param {string} orderItemId - Order item to allocate
   * @param {number} allocatedQty - Quantity to allocate
   * @param {string} allocationMonth - Month to allocate to
   * @param {string} action - 'Full' | 'Partial' | 'Push' | 'Remove'
   * @param {string} pushToMonth - If action is 'Push', the target month
   * @param {string} userId - User performing the allocation
   */
  const allocateOrderItem = useCallback(async (orderItemId, allocatedQty, allocationMonth, action = 'Full', pushToMonth = null, userId = 'Ahmed Hassan') => {
    try {
      setError(null);
      const newAllocation = await AllocationService.allocateOrderItem(
        orderItemId,
        allocatedQty,
        allocationMonth,
        action,
        pushToMonth,
        userId
      );
      await loadAllocations(); // Refresh allocations
      return newAllocation;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadAllocations]);

  /**
   * Move allocation
   */
  const moveAllocation = useCallback(async (allocationId, targetCountryId, targetMonth, quantity) => {
    try {
      setError(null);
      const newAllocation = await AllocationService.moveAllocation(
        allocationId, 
        targetCountryId, 
        targetMonth, 
        quantity
      );
      await loadAllocations(); // Refresh to get updated state
      return newAllocation;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadAllocations]);

  /**
   * Refresh allocations
   */
  const refresh = useCallback(() => {
    loadAllocations();
  }, [loadAllocations]);

  return {
    allocations,
    loading,
    error,
    filters,
    setFilters,
    createAllocation,
    allocateOrderItem,
    moveAllocation,
    refresh
  };
};

export default useAllocations;

