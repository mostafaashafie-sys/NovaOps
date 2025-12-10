import { useState, useEffect } from 'react';
import { 
  useOrderItems, 
  usePOs, 
  useAllocations, 
  useShipments, 
  useForecasts 
} from '../../../hooks/index.js';

/**
 * Custom hook for OrderManagementPanel business logic
 * Separates business logic from UI components
 */
export const useOrderManagement = ({ orderItemId, countryId, skuId, monthKey, isOpen }) => {
  const { orderItems, getOrderItemById, planOrderItem, updateOrderItemStatus, refresh: refreshOrderItems } = useOrderItems();
  const { pos, getPOById, createPO, linkOrderItemsToPO, requestPOApproval, confirmPOToUP, refresh: refreshPOs } = usePOs();
  const { allocateOrderItem, refresh: refreshAllocations } = useAllocations();
  const { createShipment, refresh: refreshShipments } = useShipments();
  const { forecasts, updateForecast, refresh: refreshForecasts } = useForecasts();
  
  const [orderItem, setOrderItem] = useState(null);
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Allocation form state
  const [allocationForm, setAllocationForm] = useState({
    allocatedQty: 0,
    allocationMonth: '',
    action: 'Full',
    pushToMonth: ''
  });

  // Load order item when ID changes
  useEffect(() => {
    if (orderItemId && isOpen) {
      loadOrderItem();
    } else if (isOpen && countryId && skuId && monthKey) {
      loadContextOrderItems();
    }
  }, [orderItemId, isOpen, countryId, skuId, monthKey]);

  const loadOrderItem = async () => {
    try {
      setLoading(true);
      const item = await getOrderItemById(orderItemId);
      setOrderItem(item);
      if (item?.poId) {
        const poData = await getPOById(item.poId);
        setPO(poData);
      }
    } catch (err) {
      console.error('Error loading order item:', err);
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

  // Initialize allocation form when order item changes
  useEffect(() => {
    if (orderItem && orderItem.status === 'Confirmed to UP') {
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
    if (!orderItem) return;
    try {
      const { allocatedQty, allocationMonth, action, pushToMonth } = allocationForm;
      
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

  const handlePlanOrderItem = async (selectedPOId, createNewPO = false) => {
    if (!orderItem || orderItem.status !== 'Forecasted') {
      throw new Error('Only forecasted order items can be planned');
    }

    try {
      let finalPOId = selectedPOId;
      
      if (createNewPO) {
        const newPO = await createPO([orderItem.id]);
        finalPOId = newPO.id;
      } else if (selectedPOId) {
        await linkOrderItemsToPO(selectedPOId, [orderItem.id]);
      } else {
        throw new Error('Please select a PO or create a new one');
      }

      await planOrderItem(orderItem.id, finalPOId);
      await loadOrderItem();
    } catch (err) {
      console.error('Error planning order item:', err);
      throw err;
    }
  };

  const handleRequestPOApproval = async (poId) => {
    try {
      await requestPOApproval(poId);
      await refreshPOs();
      if (po?.id === poId) {
        const updated = await getPOById(poId);
        setPO(updated);
      }
    } catch (err) {
      console.error('Error requesting approval:', err);
      throw err;
    }
  };

  const handleConfirmPOToUP = async (poId) => {
    try {
      await confirmPOToUP(poId);
      await refreshPOs();
      await refreshOrderItems();
      if (po?.id === poId) {
        const updated = await getPOById(poId);
        setPO(updated);
      }
      await loadOrderItem();
    } catch (err) {
      console.error('Error confirming PO:', err);
      throw err;
    }
  };

  const handleCreateShipment = async (shipmentData) => {
    if (!orderItem) return;
    try {
      await createShipment({
        orderItemId: orderItem.id,
        poId: orderItem.poId,
        countryId: orderItem.countryId,
        skuId: orderItem.skuId,
        qtyCartons: orderItem.qtyCartons,
        shipDate: shipmentData.shipDate,
        deliveryDate: shipmentData.deliveryDate,
        carrier: shipmentData.carrier
      });
      await refreshShipments();
    } catch (err) {
      console.error('Error creating shipment:', err);
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

  return {
    // State
    orderItem,
    po,
    loading,
    allocationForm,
    setAllocationForm,
    
    // Actions
    handleStatusChange,
    handleAllocate,
    handlePlanOrderItem,
    handleRequestPOApproval,
    handleConfirmPOToUP,
    handleCreateShipment,
    handleUpdateForecast,
    resetAllocationForm,
    loadOrderItem,
    
    // Data
    pos,
    forecasts
  };
};

