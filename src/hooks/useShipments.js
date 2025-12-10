import { useState, useEffect, useCallback } from 'react';
import { ShipmentService } from '../services/index.js';

/**
 * Custom Hook for Shipment Management
 * Separates UI from service layer
 */
export const useShipments = (initialFilters = {}) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  /**
   * Load shipments with current filters
   */
  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ShipmentService.getShipments(filters);
      setShipments(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading shipments:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  /**
   * Create shipment
   */
  const createShipment = useCallback(async (shipmentData) => {
    try {
      setError(null);
      const newShipment = await ShipmentService.createShipment(shipmentData);
      setShipments(prev => [...prev, newShipment]);
      return newShipment;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Update shipment status
   */
  const updateShipmentStatus = useCallback(async (shipmentId, newStatus) => {
    try {
      setError(null);
      const updated = await ShipmentService.updateShipmentStatus(shipmentId, newStatus);
      setShipments(prev => prev.map(s => 
        s.id === shipmentId ? updated : s
      ));
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Refresh shipments
   */
  const refresh = useCallback(() => {
    loadShipments();
  }, [loadShipments]);

  return {
    shipments,
    loading,
    error,
    filters,
    setFilters,
    createShipment,
    updateShipmentStatus,
    refresh
  };
};

export default useShipments;

