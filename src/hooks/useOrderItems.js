import { useState, useEffect, useCallback } from 'react';
import { OrderItemService } from '../services/index.js';

/**
 * Custom Hook for OrderItem Management
 * Separates UI from service layer
 */
export const useOrderItems = (initialFilters = {}) => {
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  /**
   * Load order items with current filters
   */
  const loadOrderItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await OrderItemService.getOrderItems(filters);
      setOrderItems(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading order items:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadOrderItems();
  }, [loadOrderItems]);

  /**
   * Get order item by ID
   */
  const getOrderItemById = useCallback(async (orderItemId) => {
    try {
      setError(null);
      const orderItem = await OrderItemService.getOrderItemById(orderItemId);
      return orderItem;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Plan a forecasted order item (link to PO)
   */
  const planOrderItem = useCallback(async (orderItemId, poId, userId = 'Ahmed Hassan') => {
    try {
      setError(null);
      const updated = await OrderItemService.planOrderItem(orderItemId, poId, userId);
      await loadOrderItems(); // Refresh
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadOrderItems]);

  /**
   * Update order item status
   */
  const updateOrderItemStatus = useCallback(async (orderItemId, newStatus, userId = 'Ahmed Hassan') => {
    try {
      setError(null);
      const updated = await OrderItemService.updateOrderItemStatus(orderItemId, newStatus, userId);
      await loadOrderItems(); // Refresh
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadOrderItems]);

  /**
   * Get forecasted order items
   */
  const getForecastedOrderItems = useCallback(async (filters = {}) => {
    try {
      setError(null);
      return await OrderItemService.getForecastedOrderItems(filters);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Get planned order items
   */
  const getPlannedOrderItems = useCallback(async (filters = {}) => {
    try {
      setError(null);
      return await OrderItemService.getPlannedOrderItems(filters);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Get confirmed to UP order items
   */
  const getConfirmedToUPOrderItems = useCallback(async (filters = {}) => {
    try {
      setError(null);
      return await OrderItemService.getConfirmedToUPOrderItems(filters);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Refresh order items
   */
  const refresh = useCallback(() => {
    loadOrderItems();
  }, [loadOrderItems]);

  return {
    orderItems,
    loading,
    error,
    filters,
    setFilters,
    getOrderItemById,
    planOrderItem,
    updateOrderItemStatus,
    getForecastedOrderItems,
    getPlannedOrderItems,
    getConfirmedToUPOrderItems,
    refresh
  };
};

export default useOrderItems;

