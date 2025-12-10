import { useState, useEffect, useCallback } from 'react';
import { OrderService } from '../services/index.js';

/**
 * Custom Hook for Order Management
 * Separates UI from service layer
 */
export const useOrders = (initialFilters = {}) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  /**
   * Load orders with current filters
   */
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await OrderService.getOrders(filters);
      setOrders(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /**
   * Create a new order
   */
  const createOrder = useCallback(async (orderData) => {
    try {
      setError(null);
      const newOrder = await OrderService.createOrder(orderData);
      setOrders(prev => [...prev, newOrder]);
      return newOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Update order status
   */
  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    try {
      setError(null);
      const updatedOrder = await OrderService.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
      return updatedOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Update order
   */
  const updateOrder = useCallback(async (orderId, orderData) => {
    try {
      setError(null);
      const updatedOrder = await OrderService.updateOrder(orderId, orderData);
      setOrders(prev => prev.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
      return updatedOrder;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Get order by ID
   */
  const getOrderById = useCallback(async (orderId) => {
    try {
      setError(null);
      return await OrderService.getOrderById(orderId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Refresh orders
   */
  const refresh = useCallback(() => {
    loadOrders();
  }, [loadOrders]);

  return {
    orders,
    loading,
    error,
    filters,
    setFilters,
    createOrder,
    updateOrderStatus,
    updateOrder,
    getOrderById,
    refresh
  };
};

export default useOrders;

