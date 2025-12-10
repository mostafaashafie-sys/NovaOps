import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { POService } from '@/services/index.js';

/**
 * Custom Hook for Purchase Order (PO) Management
 * Separates UI from service layer
 */
export const usePOs = (initialFilters = {}) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState(initialFilters);

  const { data: pos = [], isLoading: loading, error } = useQuery({
    queryKey: ['pos', filters],
    queryFn: () => POService.getPOs(filters),
  });

  const getPOById = async (poId) => {
    try {
      return await POService.getPOById(poId);
    } catch (err) {
      throw err;
    }
  };

  const getPOSummary = async (poId) => {
    try {
      return await POService.getPOSummary(poId);
    } catch (err) {
      throw err;
    }
  };

  const createPOMutation = useMutation({
    mutationFn: ({ orderItemIds, userId, poName, poDate, deliveryDate }) =>
      POService.createPO(orderItemIds, userId, poName, poDate, deliveryDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
    },
  });

  const linkOrderItemsToPOMutation = useMutation({
    mutationFn: ({ poId, orderItemIds, userId }) =>
      POService.linkOrderItemsToPO(poId, orderItemIds, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
    },
  });

  const requestPOApprovalMutation = useMutation({
    mutationFn: ({ poId, userId }) => POService.requestPOApproval(poId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const approvePOMutation = useMutation({
    mutationFn: ({ poId, managerId }) => POService.approvePO(poId, managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const rejectPOMutation = useMutation({
    mutationFn: ({ poId, managerId, reason }) =>
      POService.rejectPO(poId, managerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const confirmPOToUPMutation = useMutation({
    mutationFn: ({ poId, userId }) => POService.confirmPOToUP(poId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pos'] });
  };

  return {
    pos,
    loading,
    error: error?.message || null,
    filters,
    setFilters,
    getPOById,
    getPOSummary,
    createPO: (orderItemIds = [], userId = 'Ahmed Hassan', poName = null, poDate = null, deliveryDate = null) =>
      createPOMutation.mutateAsync({ orderItemIds, userId, poName, poDate, deliveryDate }),
    linkOrderItemsToPO: (poId, orderItemIds, userId = 'Ahmed Hassan') =>
      linkOrderItemsToPOMutation.mutateAsync({ poId, orderItemIds, userId }),
    requestPOApproval: (poId, userId = 'Ahmed Hassan') =>
      requestPOApprovalMutation.mutateAsync({ poId, userId }),
    approvePO: (poId, managerId = 'Manager User') =>
      approvePOMutation.mutateAsync({ poId, managerId }),
    rejectPO: (poId, managerId = 'Manager User', reason = '') =>
      rejectPOMutation.mutateAsync({ poId, managerId, reason }),
    confirmPOToUP: (poId, userId = 'Ahmed Hassan') =>
      confirmPOToUPMutation.mutateAsync({ poId, userId }),
    checkAndUpdatePOCompletion: (poId) =>
      POService.checkAndUpdatePOCompletion(poId),
    refresh
  };
};

export default usePOs;
