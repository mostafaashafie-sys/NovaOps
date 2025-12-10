import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AllocationService } from '@/services/index.js';

/**
 * Custom Hook for Allocation Management
 * Separates UI from service layer
 */
export const useAllocations = (initialFilters = {}) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState(initialFilters);

  const { data: allocations = [], isLoading: loading, error } = useQuery({
    queryKey: ['allocations', filters],
    queryFn: () => AllocationService.getAllocations(filters),
  });

  const createAllocationMutation = useMutation({
    mutationFn: (data) => AllocationService.createAllocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    },
  });

  /**
   * Allocate order item (full or partial with push/remove options)
   * @param {string} orderItemId - Order item to allocate
   * @param {number} allocatedQty - Quantity to allocate
   * @param {string} allocationMonth - Month to allocate to
   * @param {string} action - 'Full' | 'Partial' | 'Push' | 'Remove'
   * @param {string} pushToMonth - If action is 'Push', the target month
   * @param {string} userId - User performing the allocation
   */
  const allocateOrderItemMutation = useMutation({
    mutationFn: ({ orderItemId, allocatedQty, allocationMonth, action, pushToMonth, userId }) =>
      AllocationService.allocateOrderItem(
        orderItemId,
        allocatedQty,
        allocationMonth,
        action,
        pushToMonth,
        userId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
    },
  });

  const moveAllocationMutation = useMutation({
    mutationFn: ({ allocationId, targetCountryId, targetMonth, quantity }) =>
      AllocationService.moveAllocation(allocationId, targetCountryId, targetMonth, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['allocations'] });
  };

  return {
    allocations,
    loading,
    error: error?.message || null,
    filters,
    setFilters,
    createAllocation: createAllocationMutation.mutateAsync,
    allocateOrderItem: (orderItemId, allocatedQty, allocationMonth, action = 'Full', pushToMonth = null, userId = 'Ahmed Hassan') =>
      allocateOrderItemMutation.mutateAsync({
        orderItemId,
        allocatedQty,
        allocationMonth,
        action,
        pushToMonth,
        userId
      }),
    moveAllocation: (allocationId, targetCountryId, targetMonth, quantity) =>
      moveAllocationMutation.mutateAsync({
        allocationId,
        targetCountryId,
        targetMonth,
        quantity
      }),
    refresh
  };
};

export default useAllocations;
