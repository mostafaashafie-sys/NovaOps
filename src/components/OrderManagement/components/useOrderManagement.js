import { useState, useEffect } from 'react';
import { 
  useOrderItems, 
  usePOs, 
  useAllocations, 
  useForecasts 
} from '@/hooks/index.js';
import { LabelService } from '@/services/index.js';
import logger from '@/services/LoggerService.js';

/**
 * Custom hook for OrderManagementPanel business logic
 * Separates business logic from UI components
 */
export const useOrderManagement = ({ orderItemId, countryId, skuId, monthKey, isOpen }) => {
  const { orderItems, getOrderItemById, planOrderItem, confirmOrderItemToPO, updateOrderItemStatus, updateOrderItem, deleteOrderItem, approveRegulatoryLabel, rejectRegulatoryLabel, refresh: refreshOrderItems } = useOrderItems();
  const { pos, getPOById, createPO, linkOrderItemsToPO, checkAndUpdatePOCompletion, refresh: refreshPOs } = usePOs();
  const { allocateOrderItem, refresh: refreshAllocations } = useAllocations();
  const { forecasts, updateForecast, refresh: refreshForecasts } = useForecasts();
  
  const [orderItem, setOrderItem] = useState(null);
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState([]);
  
  // Allocation form state
  const [allocationForm, setAllocationForm] = useState({
    allocatedQty: 0,
    allocationMonth: '',
    action: 'Full',
    pushToMonth: ''
  });

  // Helper function to check if orderItemId is valid (GUID or OI- prefixed)
  const isValidOrderItemId = (id) => {
    if (!id) return false;
    // Check if it's a GUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Or check if it starts with 'OI-' (legacy format)
    return guidPattern.test(id) || id.startsWith('OI-');
  };

  // Load order item when ID changes
  useEffect(() => {
    // Only load order item if we have a valid orderItemId
    // Skip loading when orderItemId is null (e.g., when creating a new order)
    if (isOpen && orderItemId && isValidOrderItemId(orderItemId)) {
      loadOrderItem();
    } else if (isOpen && !orderItemId && countryId && skuId && monthKey) {
      // When creating a new order (orderItemId is null), clear the order item
      setOrderItem(null);
      setPO(null);
    }
  }, [orderItemId, isOpen]); // Removed unnecessary dependencies to prevent duplicate loads

  const loadOrderItem = async () => {
    // Skip if orderItemId is invalid
    if (!orderItemId || !isValidOrderItemId(orderItemId)) {
      setOrderItem(null);
      return;
    }
    
    try {
      setLoading(true);
      logger.debug('Loading order item', { orderItemId });
      const item = await getOrderItemById(orderItemId);
      if (!item) {
        logger.warn('Order item not found', { orderItemId });
        setOrderItem(null);
        return;
      }
      logger.debug('Order item loaded', { itemId: item.id, status: item.status });
      setOrderItem(item);
      if (item?.poId) {
        const poData = await getPOById(item.poId);
        setPO(poData);
      }
    } catch (err) {
      logger.error('Error loading order item', err);
      setOrderItem(null);
    } finally {
      setLoading(false);
    }
  };

  const loadContextOrderItems = async () => {
    setOrderItem(null);
  };

  const resetAllocationForm = () => {
    if (orderItem) {
      setAllocationForm({
        allocatedQty: orderItem.qtyCartons,
        allocationMonth: orderItem.deliveryMonth,
        action: 'Full',
        pushToMonth: ''
      });
    } else {
      setAllocationForm({ allocatedQty: 0, allocationMonth: '', action: 'Full', pushToMonth: '' });
    }
  };

  // Load labels when component mounts
  useEffect(() => {
    const loadLabels = async () => {
      try {
        // Use status instead of isActive (0 = Active, 1 = Inactive in Dataverse)
        // status maps to statecode in the schema
        const labelsData = await LabelService.getLabels({ status: 0 });
        setLabels(labelsData);
      } catch (err) {
        console.error('Error loading labels:', err);
      }
    };
    if (isOpen) {
      loadLabels();
    }
  }, [isOpen]);

  // Initialize allocation form when order item changes
  useEffect(() => {
    if (orderItem && orderItem.status === 'Back Order') {
      resetAllocationForm();
    }
  }, [orderItem?.id, orderItem?.status]);

  const handleStatusChange = async (newStatus) => {
    if (!orderItem) return;
    try {
      await updateOrderItemStatus(orderItem.id, newStatus);
      await loadOrderItem();
    } catch (err) {
      console.error('Error updating status:', err);
      throw err;
    }
  };

  const handleAllocate = async () => {
    if (!orderItem) {
      throw new Error('Order item not found');
    }
    
    // Validate status before attempting allocation
    if (orderItem.status !== 'Back Order') {
      throw new Error(`Cannot allocate order item: Current status is "${orderItem.status}". Only items with status "Back Order" can be allocated.`);
    }
    
    try {
      const { allocatedQty, allocationMonth, action, pushToMonth } = allocationForm;
      
      // Refresh order item to ensure we have latest status
      const latestOrderItem = await getOrderItemById(orderItem.id);
      if (latestOrderItem && latestOrderItem.status !== 'Back Order') {
        throw new Error(`Order item status changed. Current status is "${latestOrderItem.status}". Please refresh and try again.`);
      }
      
      await allocateOrderItem(
        orderItem.id,
        allocatedQty,
        allocationMonth || orderItem.deliveryMonth,
        action,
        pushToMonth || null
      );
      
      await refreshAllocations();
      await refreshOrderItems();
      await loadOrderItem();
      resetAllocationForm();
    } catch (err) {
      console.error('Error allocating:', err);
      throw err;
    }
  };

  const handlePlanOrderItem = async (selectedPOId, createNewPO = false, poDetails = null) => {
    if (!orderItem || orderItem.status !== 'Forecasted') {
      throw new Error('Only forecasted order items can be planned');
    }

    try {
      let finalPOId = selectedPOId;
      
      if (createNewPO) {
        if (!poDetails || !poDetails.poName || !poDetails.poDate || !poDetails.deliveryDate) {
          throw new Error('PO name, PO date, and delivery date are required when creating a new PO');
        }
        const newPO = await createPO(
          [orderItem.id], 
          'Ahmed Hassan', 
          poDetails.poName, 
          poDetails.poDate, 
          poDetails.deliveryDate
        );
        finalPOId = newPO.id;
      } else if (selectedPOId) {
        // Validate country match before linking
        const targetPO = await getPOById(selectedPOId);
        if (targetPO) {
          if (targetPO.countries && targetPO.countries.length > 0) {
            const poCountry = targetPO.countries[0];
            if (poCountry !== orderItem.countryId) {
              const poCountryName = targetPO.orderItems?.find(oi => oi.countryId === poCountry)?.countryName || poCountry;
              throw new Error(`Cannot link order item to PO ${selectedPOId}: Order item is for ${orderItem.countryName}, but PO contains items for ${poCountryName}. A PO can only contain order items for one country.`);
            }
          }
        }
        await linkOrderItemsToPO(selectedPOId, [orderItem.id]);
      } else {
        throw new Error('Please select a PO or create a new one');
      }

      await planOrderItem(orderItem.id, finalPOId);
      await refreshOrderItems();
      await refreshPOs();
      await loadOrderItem();
    } catch (err) {
      console.error('Error planning order item:', err);
      throw err;
    }
  };

  const handleConfirmToPO = async (labelId, poId = null, poDetails = null) => {
    // First, ensure we have a valid order item loaded
    if (!orderItem) {
      // Try to reload if we have an orderItemId
      if (orderItemId && isValidOrderItemId(orderItemId)) {
        await loadOrderItem();
        // Check again after reload
        if (!orderItem) {
          throw new Error('Order item not found. Please refresh and try again.');
        }
      } else {
        throw new Error('No order item selected');
      }
    }
    
    if (!orderItem.id) {
      throw new Error('Order item ID is missing. Please wait for the order item to be fully created.');
    }
    
    // Ensure orderItem.id is valid
    if (!isValidOrderItemId(orderItem.id)) {
      throw new Error('Invalid order item ID. Please refresh and try again.');
    }
    
    // Allow both Forecasted and Planned items to be confirmed (if Forecasted, we'll plan first)
    if (orderItem.status !== 'Planned' && orderItem.status !== 'Forecasted') {
      throw new Error('Only planned or forecasted order items can be confirmed to PO');
    }
    if (!labelId) {
      throw new Error('Label selection is required');
    }

    try {
      let finalPOId = poId || orderItem.poId;
      
      // If creating new PO (poId is explicitly null), create PO first (empty), then link order item
      if (poId === null && !orderItem.poId) {
        if (!poDetails || !poDetails.poName || !poDetails.poDate || !poDetails.deliveryDate) {
          throw new Error('PO name, PO date, and delivery date are required when creating a new PO');
        }
        
        // Double-check orderItem.id is still valid (it should be after the checks above)
        const validOrderItemId = orderItem.id;
        if (!validOrderItemId || !isValidOrderItemId(validOrderItemId)) {
          throw new Error('Invalid order item ID. Please refresh and try again.');
        }
        
        logger.action('Creating new PO (empty, will link order item after)', { 
          poName: poDetails.poName
        });
        
        // Step 1: Create PO without order items (empty array)
        const newPO = await createPO(
          [], // Empty array - create PO first
          'Ahmed Hassan', 
          poDetails.poName, 
          poDetails.poDate, 
          poDetails.deliveryDate
        );
        finalPOId = newPO.id;
        
        logger.action('PO created, now linking order item', { 
          poId: finalPOId,
          orderItemId: validOrderItemId
        });
        
        // Step 2: Link order item to the newly created PO
        await linkOrderItemsToPO(finalPOId, [validOrderItemId]);
        
        // Step 3: Refresh order item to get updated poId
        await refreshOrderItems();
        await loadOrderItem();
      } else if (poId && poId !== orderItem.poId) {
        // If PO ID provided and different, validate country match before linking
        const targetPO = await getPOById(poId);
        if (targetPO) {
          // Check if PO has items and validate country
          if (targetPO.countries && targetPO.countries.length > 0) {
            const poCountry = targetPO.countries[0];
            if (poCountry !== orderItem.countryId) {
              const poCountryName = targetPO.orderItems?.find(oi => oi.countryId === poCountry)?.countryName || poCountry;
              throw new Error(`Cannot link order item to PO ${poId}: Order item is for ${orderItem.countryName}, but PO contains items for ${poCountryName}. A PO can only contain order items for one country.`);
            }
          }
        }
        finalPOId = poId;
      }
      
      // If Forecasted, plan it first (link to PO)
      if (orderItem.status === 'Forecasted') {
        if (!finalPOId) {
          throw new Error('PO is required to confirm order item');
        }
        await planOrderItem(orderItem.id, finalPOId);
      } else if (finalPOId && finalPOId !== orderItem.poId) {
        // If Planned and PO changed, link to new PO (country already validated above)
        // Use linkOrderItemsToPO to update the PO link without changing status
        await linkOrderItemsToPO(finalPOId, [orderItem.id]);
        // Refresh to get updated order item with new poId
        await refreshOrderItems();
      }
      
      // Then confirm to PO with label
      await confirmOrderItemToPO(orderItem.id, labelId);
      
      // Refresh all related data
      await refreshOrderItems();
      await refreshPOs();
      await loadOrderItem();
    } catch (err) {
      console.error('Error confirming order item to PO:', err);
      throw err;
    }
  };

  const handleUpdateForecast = async (forecastData) => {
    const relatedForecast = forecasts.find(f => 
      f.countryId === countryId && 
      f.skuId === skuId && 
      f.monthKey === monthKey
    );
    
    if (!relatedForecast) {
      throw new Error('Forecast not found for this period');
    }

    try {
      await updateForecast(relatedForecast.id, forecastData);
      await refreshForecasts();
    } catch (err) {
      console.error('Error updating forecast:', err);
      throw err;
    }
  };

  const handleApproveRegulatory = async () => {
    if (!orderItem) return;
    try {
      await approveRegulatoryLabel(orderItem.id);
      await loadOrderItem();
    } catch (err) {
      console.error('Error approving regulatory label:', err);
      throw err;
    }
  };

  const handleRejectRegulatory = async (reason = '') => {
    if (!orderItem) return;
    try {
      await rejectRegulatoryLabel(orderItem.id, reason);
      await loadOrderItem();
    } catch (err) {
      console.error('Error rejecting regulatory label:', err);
      throw err;
    }
  };

  const handleUpdateOrderItem = async ({ orderItemId, qtyCartons, deliveryMonth }) => {
    if (!orderItemId) {
      throw new Error('Order item ID is required');
    }
    try {
      const updates = {};
      if (qtyCartons !== undefined) updates.qtyCartons = qtyCartons;
      if (deliveryMonth !== undefined) updates.deliveryMonth = deliveryMonth;
      
      await updateOrderItem(orderItemId, updates);
      await refreshOrderItems();
      await loadOrderItem();
    } catch (err) {
      console.error('Error updating order item:', err);
      throw err;
    }
  };

  const handleDeleteOrderItem = async () => {
    if (!orderItem) {
      throw new Error('No order item selected');
    }
    if (orderItem.status !== 'Forecasted' && orderItem.status !== 'Planned') {
      throw new Error('Only Forecasted and Planned order items can be deleted');
    }
    
    if (!confirm(`Are you sure you want to delete order item ${orderItem.id}?`)) {
      return;
    }
    
    try {
      await deleteOrderItem(orderItem.id);
      await refreshOrderItems();
      // Reload order item to clear it (will be null after deletion)
      await loadOrderItem();
    } catch (err) {
      console.error('Error deleting order item:', err);
      throw err;
    }
  };

  return {
    // State
    orderItem,
    po,
    loading,
    allocationForm,
    setAllocationForm,
    labels,
    
    // Actions
    handleStatusChange,
    handleAllocate,
    handlePlanOrderItem,
    handleConfirmToPO,
    handleUpdateForecast,
    handleApproveRegulatory,
    handleRejectRegulatory,
    handleUpdateOrderItem,
    handleDeleteOrderItem,
    resetAllocationForm,
    loadOrderItem,
    
    // Data
    pos,
    forecasts
  };
};

