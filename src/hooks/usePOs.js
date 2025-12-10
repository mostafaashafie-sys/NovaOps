import { useState, useEffect, useCallback } from 'react';
import { POService } from '../services/index.js';

/**
 * Custom Hook for Purchase Order (PO) Management
 * Separates UI from service layer
 */
export const usePOs = (initialFilters = {}) => {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  /**
   * Load POs with current filters
   */
  const loadPOs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await POService.getPOs(filters);
      setPOs(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading POs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPOs();
  }, [loadPOs]);

  /**
   * Get PO by ID
   */
  const getPOById = useCallback(async (poId) => {
    try {
      setError(null);
      const po = await POService.getPOById(poId);
      return po;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Get PO summary (with order items)
   */
  const getPOSummary = useCallback(async (poId) => {
    try {
      setError(null);
      const summary = await POService.getPOSummary(poId);
      return summary;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Create a new PO
   */
  const createPO = useCallback(async (orderItemIds = [], userId = 'Ahmed Hassan') => {
    try {
      setError(null);
      const newPO = await POService.createPO(orderItemIds, userId);
      await loadPOs(); // Refresh
      return newPO;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadPOs]);

  /**
   * Link order items to existing PO
   */
  const linkOrderItemsToPO = useCallback(async (poId, orderItemIds, userId = 'Ahmed Hassan') => {
    try {
      setError(null);
      const updated = await POService.linkOrderItemsToPO(poId, orderItemIds, userId);
      await loadPOs(); // Refresh
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadPOs]);

  /**
   * Request PO approval
   */
  const requestPOApproval = useCallback(async (poId, userId = 'Ahmed Hassan') => {
    try {
      setError(null);
      const updated = await POService.requestPOApproval(poId, userId);
      await loadPOs(); // Refresh
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadPOs]);

  /**
   * Approve PO (Manager action)
   */
  const approvePO = useCallback(async (poId, managerId = 'Manager User') => {
    try {
      setError(null);
      const updated = await POService.approvePO(poId, managerId);
      await loadPOs(); // Refresh
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadPOs]);

  /**
   * Reject PO (Manager action)
   */
  const rejectPO = useCallback(async (poId, managerId = 'Manager User', reason = '') => {
    try {
      setError(null);
      const updated = await POService.rejectPO(poId, managerId, reason);
      await loadPOs(); // Refresh
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadPOs]);

  /**
   * Confirm PO to UP
   */
  const confirmPOToUP = useCallback(async (poId, userId = 'Ahmed Hassan') => {
    try {
      setError(null);
      const updated = await POService.confirmPOToUP(poId, userId);
      await loadPOs(); // Refresh
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadPOs]);

  /**
   * Refresh POs
   */
  const refresh = useCallback(() => {
    loadPOs();
  }, [loadPOs]);

  return {
    pos,
    loading,
    error,
    filters,
    setFilters,
    getPOById,
    getPOSummary,
    createPO,
    linkOrderItemsToPO,
    requestPOApproval,
    approvePO,
    rejectPO,
    confirmPOToUP,
    refresh
  };
};

export default usePOs;

