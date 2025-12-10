import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderItemService } from '@/services/index.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('useOrderItems');

/**
 * Custom Hook for OrderItem Management
 * Separates UI from service layer
 */
export const useOrderItems = (initialFilters = {}) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState(initialFilters);

  const { data: orderItems = [], isLoading: loading, error } = useQuery({
    queryKey: ['orderItems', filters],
    queryFn: () => OrderItemService.getOrderItems(filters),
  });

  const getOrderItemById = async (orderItemId) => {
    try {
      return await OrderItemService.getOrderItemById(orderItemId);
    } catch (err) {
      throw err;
    }
  };

  const planOrderItemMutation = useMutation({
    mutationFn: ({ orderItemId, poId, userId }) =>
      OrderItemService.planOrderItem(orderItemId, poId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const confirmOrderItemToPOMutation = useMutation({
    mutationFn: ({ orderItemId, labelId, userId }) =>
      OrderItemService.confirmOrderItemToPO(orderItemId, labelId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const updateOrderItemStatusMutation = useMutation({
    mutationFn: ({ orderItemId, newStatus, userId }) =>
      OrderItemService.updateOrderItemStatus(orderItemId, newStatus, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
    },
  });

  const approveRegulatoryLabelMutation = useMutation({
    mutationFn: ({ orderItemId, userId }) =>
      OrderItemService.approveRegulatoryLabel(orderItemId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const rejectRegulatoryLabelMutation = useMutation({
    mutationFn: ({ orderItemId, reason, userId }) =>
      OrderItemService.rejectRegulatoryLabel(orderItemId, reason, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const getForecastedOrderItems = async (filters = {}) => {
    try {
      return await OrderItemService.getForecastedOrderItems(filters);
    } catch (err) {
      throw err;
    }
  };

  const getPlannedOrderItems = async (filters = {}) => {
    try {
      return await OrderItemService.getPlannedOrderItems(filters);
    } catch (err) {
      throw err;
    }
  };

  const getBackOrderItems = async (filters = {}) => {
    try {
      return await OrderItemService.getBackOrderItems(filters);
    } catch (err) {
      throw err;
    }
  };

  const getPendingRegulatoryItems = async (filters = {}) => {
    try {
      return await OrderItemService.getPendingRegulatoryItems(filters);
    } catch (err) {
      throw err;
    }
  };

  const getRegulatoryApprovedItems = async (filters = {}) => {
    try {
      return await OrderItemService.getRegulatoryApprovedItems(filters);
    } catch (err) {
      throw err;
    }
  };

  const createOrderItemMutation = useMutation({
    mutationFn: (orderItemData) => OrderItemService.createOrderItem(orderItemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
    },
  });

  const updateDeliveryMonthMutation = useMutation({
    mutationFn: ({ orderItemId, newDeliveryMonth, userId }) => {
      logger.action('updateDeliveryMonth mutation started', {
        orderItemId,
        newDeliveryMonth,
        userId
      });
      return OrderItemService.updateOrderItemDeliveryMonth(orderItemId, newDeliveryMonth, userId);
    },
    onSuccess: (data) => {
      logger.success('updateDeliveryMonth mutation succeeded', {
        orderItemId: data?.id,
        newDeliveryMonth: data?.deliveryMonth
      });
      logger.debug('Invalidating queries: orderItems, stockCover');
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      queryClient.invalidateQueries({ queryKey: ['stockCover'] });
      logger.debug('Queries invalidated');
    },
    onError: (error) => {
      logger.error('updateDeliveryMonth mutation failed', {
        error: error.message,
        stack: error.stack
      });
    },
  });

  const updateOrderItemMutation = useMutation({
    mutationFn: ({ orderItemId, ...updates }) =>
      OrderItemService.updateOrderItem(orderItemId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      queryClient.invalidateQueries({ queryKey: ['stockCover'] });
    },
  });

  const deleteOrderItemMutation = useMutation({
    mutationFn: ({ orderItemId, userId }) =>
      OrderItemService.deleteOrderItem(orderItemId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      queryClient.invalidateQueries({ queryKey: ['stockCover'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['orderItems'] });
  };

  return {
    orderItems,
    loading,
    error: error?.message || null,
    filters,
    setFilters,
    getOrderItemById,
    planOrderItem: (orderItemId, poId, userId = 'Ahmed Hassan') =>
      planOrderItemMutation.mutateAsync({ orderItemId, poId, userId }),
    confirmOrderItemToPO: (orderItemId, labelId, userId = 'Ahmed Hassan') =>
      confirmOrderItemToPOMutation.mutateAsync({ orderItemId, labelId, userId }),
    updateOrderItemStatus: (orderItemId, newStatus, userId = 'Ahmed Hassan') =>
      updateOrderItemStatusMutation.mutateAsync({ orderItemId, newStatus, userId }),
    approveRegulatoryLabel: (orderItemId, userId = 'Regulatory Office') =>
      approveRegulatoryLabelMutation.mutateAsync({ orderItemId, userId }),
    rejectRegulatoryLabel: (orderItemId, reason = '', userId = 'Regulatory Office') =>
      rejectRegulatoryLabelMutation.mutateAsync({ orderItemId, reason, userId }),
    createOrderItem: (orderItemData) =>
      createOrderItemMutation.mutateAsync(orderItemData),
    updateDeliveryMonth: (orderItemId, newDeliveryMonth, userId = 'Ahmed Hassan') =>
      updateDeliveryMonthMutation.mutateAsync({ orderItemId, newDeliveryMonth, userId }),
    updateOrderItem: (orderItemId, updates, userId = 'Ahmed Hassan') =>
      updateOrderItemMutation.mutateAsync({ orderItemId, ...updates, userId }),
    deleteOrderItem: (orderItemId, userId = 'Ahmed Hassan') =>
      deleteOrderItemMutation.mutateAsync({ orderItemId, userId }),
    getForecastedOrderItems,
    getPlannedOrderItems,
    getBackOrderItems,
    getPendingRegulatoryItems,
    getRegulatoryApprovedItems,
    refresh
  };
};

export default useOrderItems;
