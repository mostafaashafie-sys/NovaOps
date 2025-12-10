import DataverseService from './DataverseService.js';
import MockDataService from './MockDataService.js';
import { DataverseConfig } from '@/config/index.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('OrderItemService');

/**
 * OrderItem Service
 * Handles order item business logic (forecasted items, planning, linking to POs)
 */
class OrderItemService {
  constructor(useMock = true) {
    this.useMock = useMock;
    this.dataverseService = DataverseService;
    this.mockData = useMock ? MockDataService.generateMockData() : null;
  }

  /**
   * Get all order items with optional filters
   */
  async getOrderItems(filters = {}) {
    if (this.useMock) {
      let orderItems = this.mockData.orderItems || [];
      
      if (filters.countryId) {
        orderItems = orderItems.filter(oi => oi.countryId === filters.countryId);
      }
      if (filters.skuId) {
        orderItems = orderItems.filter(oi => oi.skuId === filters.skuId);
      }
      if (filters.status) {
        orderItems = orderItems.filter(oi => oi.status === filters.status);
      }
      if (filters.poId) {
        orderItems = orderItems.filter(oi => oi.poId === filters.poId);
      }
      if (filters.deliveryMonth) {
        orderItems = orderItems.filter(oi => oi.deliveryMonth === filters.deliveryMonth);
      }
      
      return orderItems;
    }
    
    return this.dataverseService.getOrderItems(filters);
  }

  /**
   * Get order item by ID
   */
  async getOrderItemById(orderItemId) {
    if (this.useMock) {
      return (this.mockData.orderItems || []).find(oi => oi.id === orderItemId) || null;
    }
    
    return this.dataverseService.fetch(`/${DataverseConfig.tables.orderItems}(${orderItemId})`);
  }

  /**
   * Plan a forecasted order item (change status to Planned)
   * This only links to PO, does not confirm to PO
   */
  async planOrderItem(orderItemId, poId, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const orderItem = (this.mockData.orderItems || []).find(oi => oi.id === orderItemId);
      if (orderItem) {
        if (orderItem.status !== 'Forecasted') {
          throw new Error('Only forecasted order items can be planned');
        }
        orderItem.status = 'Planned';
        orderItem.poId = poId;
        orderItem.modifiedBy = userId;
        orderItem.modifiedOn = new Date().toISOString();
        if (!orderItem.history) orderItem.history = [];
        orderItem.history.push({
          action: 'Planned',
          by: userId,
          date: new Date().toISOString()
        });
      }
      return orderItem;
    }
    
    return this.dataverseService.updateOrderItem(orderItemId, {
      status: 'Planned',
      poId: poId,
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Confirm order item to PO with label selection
   * Changes status: Planned → Pending Regulatory
   * Requires label selection
   */
  async confirmOrderItemToPO(orderItemId, labelId, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const orderItem = (this.mockData.orderItems || []).find(oi => oi.id === orderItemId);
      if (!orderItem) {
        throw new Error('Order item not found');
      }
      if (orderItem.status !== 'Planned') {
        throw new Error('Only planned order items can be confirmed to PO');
      }
      if (!labelId) {
        throw new Error('Label selection is required to confirm order item to PO');
      }
      
      orderItem.status = 'Pending Regulatory';
      orderItem.labelId = labelId;
      orderItem.modifiedBy = userId;
      orderItem.modifiedOn = new Date().toISOString();
      if (!orderItem.history) orderItem.history = [];
      orderItem.history.push({
        action: 'Confirmed to PO - Pending Regulatory',
        by: userId,
        date: new Date().toISOString(),
        labelId: labelId
      });
      
      return orderItem;
    }
    
    return this.dataverseService.updateOrderItem(orderItemId, {
      status: 'Pending Regulatory',
      labelId: labelId,
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Approve regulatory label (Regulatory Office action)
   * Changes status: Pending Regulatory → Regulatory Approved
   */
  async approveRegulatoryLabel(orderItemId, userId = 'Regulatory Office') {
    if (this.useMock) {
      const orderItem = (this.mockData.orderItems || []).find(oi => oi.id === orderItemId);
      if (!orderItem) {
        throw new Error('Order item not found');
      }
      if (orderItem.status !== 'Pending Regulatory') {
        throw new Error('Only order items with Pending Regulatory status can be approved');
      }
      
      orderItem.status = 'Regulatory Approved';
      orderItem.modifiedBy = userId;
      orderItem.modifiedOn = new Date().toISOString();
      if (!orderItem.history) orderItem.history = [];
      orderItem.history.push({
        action: 'Regulatory Approved',
        by: userId,
        date: new Date().toISOString()
      });
      
      return orderItem;
    }
    
    return this.dataverseService.updateOrderItem(orderItemId, {
      status: 'Regulatory Approved',
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Reject regulatory label (Regulatory Office action)
   * Changes status: Pending Regulatory → Planned
   */
  async rejectRegulatoryLabel(orderItemId, reason = '', userId = 'Regulatory Office') {
    if (this.useMock) {
      const orderItem = (this.mockData.orderItems || []).find(oi => oi.id === orderItemId);
      if (!orderItem) {
        throw new Error('Order item not found');
      }
      if (orderItem.status !== 'Pending Regulatory') {
        throw new Error('Only order items with Pending Regulatory status can be rejected');
      }
      
      orderItem.status = 'Planned';
      orderItem.labelId = null; // Remove label on rejection
      orderItem.modifiedBy = userId;
      orderItem.modifiedOn = new Date().toISOString();
      if (!orderItem.history) orderItem.history = [];
      orderItem.history.push({
        action: 'Regulatory Rejected',
        by: userId,
        date: new Date().toISOString(),
        reason: reason
      });
      
      return orderItem;
    }
    
    return this.dataverseService.updateOrderItem(orderItemId, {
      status: 'Planned',
      labelId: null,
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Update order item (quantity and/or delivery month)
   * Only allowed for Forecasted and Planned items
   */
  async updateOrderItem(orderItemId, updates, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const orderItem = (this.mockData.orderItems || []).find(oi => oi.id === orderItemId);
      if (!orderItem) {
        throw new Error('Order item not found');
      }
      
      // Only allow editing for Forecasted and Planned items
      if (orderItem.status !== 'Forecasted' && orderItem.status !== 'Planned') {
        throw new Error('Only Forecasted and Planned order items can be edited');
      }
      
      const changes = [];
      const wasForecasted = orderItem.status === 'Forecasted';
      
      if (updates.qtyCartons !== undefined && updates.qtyCartons !== orderItem.qtyCartons) {
        const oldQty = orderItem.qtyCartons;
        orderItem.qtyCartons = updates.qtyCartons;
        changes.push(`Quantity: ${oldQty} → ${updates.qtyCartons}`);
      }
      
      if (updates.deliveryMonth !== undefined && updates.deliveryMonth !== orderItem.deliveryMonth) {
        const oldMonth = orderItem.deliveryMonth;
        orderItem.deliveryMonth = updates.deliveryMonth;
        changes.push(`Delivery Month: ${oldMonth} → ${updates.deliveryMonth}`);
      }
      
      // If user edits a Forecasted item, it becomes Planned (per lifecycle logic)
      if (wasForecasted && changes.length > 0) {
        orderItem.status = 'Planned';
        changes.push('Status: Forecasted → Planned (edited by user)');
      }
      
      if (changes.length > 0) {
        orderItem.modifiedBy = userId;
        orderItem.modifiedOn = new Date().toISOString();
        if (!orderItem.history) orderItem.history = [];
        orderItem.history.push({
          action: `Updated: ${changes.join(', ')}`,
          by: userId,
          date: new Date().toISOString()
        });
      }
      
      return orderItem;
    }
    
    return this.dataverseService.updateOrderItem(orderItemId, {
      ...updates,
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Update order item status
   */
  async updateOrderItemStatus(orderItemId, newStatus, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const orderItem = (this.mockData.orderItems || []).find(oi => oi.id === orderItemId);
      if (orderItem) {
        orderItem.status = newStatus;
        orderItem.modifiedBy = userId;
        orderItem.modifiedOn = new Date().toISOString();
        if (!orderItem.history) orderItem.history = [];
        orderItem.history.push({
          action: newStatus,
          by: userId,
          date: new Date().toISOString()
        });
      }
      return orderItem;
    }
    
    return this.dataverseService.updateOrderItem(orderItemId, {
      status: newStatus,
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Create order item from forecast (when pushing remaining quantity)
   */
  async createOrderItemFromPush(originalOrderItemId, newDeliveryMonth, remainingQty, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const original = (this.mockData.orderItems || []).find(oi => oi.id === originalOrderItemId);
      if (!original) {
        throw new Error('Original order item not found');
      }
      
      const newOrderItem = {
        id: `OI-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        countryId: original.countryId,
        countryName: original.countryName,
        skuId: original.skuId,
        skuName: original.skuName,
        status: 'Back Order', // Pushed items start as Back Order (not Planned)
        qtyCartons: remainingQty,
        deliveryMonth: newDeliveryMonth,
        poId: original.poId, // Linked to same PO
        originalOrderItemId: originalOrderItemId,
        isSystemGenerated: false,
        channel: original.channel || 'Private',
        tender: original.tender || false,
        comments: `Pushed from ${original.id}`,
        createdBy: userId,
        createdOn: new Date().toISOString(),
        modifiedBy: userId,
        modifiedOn: new Date().toISOString(),
        history: [{
          action: 'Created from Push',
          by: userId,
          date: new Date().toISOString()
        }]
      };
      
      if (!this.mockData.orderItems) this.mockData.orderItems = [];
      this.mockData.orderItems.push(newOrderItem);
      return newOrderItem;
    }
    
    return this.dataverseService.createOrderItem(newOrderItem);
  }

  /**
   * Get forecasted order items (system-generated)
   */
  async getForecastedOrderItems(filters = {}) {
    return this.getOrderItems({ ...filters, status: 'Forecasted' });
  }

  /**
   * Get planned order items
   */
  async getPlannedOrderItems(filters = {}) {
    return this.getOrderItems({ ...filters, status: 'Planned' });
  }

  /**
   * Get order items with Back Order status
   */
  async getBackOrderItems(filters = {}) {
    return this.getOrderItems({ ...filters, status: 'Back Order' });
  }

  /**
   * Get order items pending regulatory approval
   */
  async getPendingRegulatoryItems(filters = {}) {
    return this.getOrderItems({ ...filters, status: 'Pending Regulatory' });
  }

  /**
   * Get order items with regulatory approved status
   */
  async getRegulatoryApprovedItems(filters = {}) {
    return this.getOrderItems({ ...filters, status: 'Regulatory Approved' });
  }

  /**
   * Create a new order item
   */
  async createOrderItem(orderItemData) {
    if (this.useMock) {
      const newOrderItem = {
        id: `OI-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        ...orderItemData,
        status: orderItemData.status || 'Draft',
        isSystemGenerated: false,
        createdOn: new Date().toISOString(),
        modifiedOn: new Date().toISOString(),
        createdBy: orderItemData.createdBy || 'Ahmed Hassan',
        modifiedBy: orderItemData.modifiedBy || 'Ahmed Hassan',
        history: [{
          action: 'Created',
          by: orderItemData.createdBy || 'Ahmed Hassan',
          date: new Date().toISOString()
        }]
      };
      
      if (!this.mockData.orderItems) this.mockData.orderItems = [];
      this.mockData.orderItems.push(newOrderItem);
      return newOrderItem;
    }
    
    return this.dataverseService.createOrderItem(orderItemData);
  }

  /**
   * Delete order item (only allowed for Forecasted and Planned items)
   * Changes status to 'Deleted' instead of removing from array (for tracking)
   */
  async deleteOrderItem(orderItemId, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const orderItem = (this.mockData.orderItems || []).find(oi => oi.id === orderItemId);
      if (!orderItem) {
        throw new Error('Order item not found');
      }
      
      // Only allow deletion for Forecasted and Planned items
      if (orderItem.status !== 'Forecasted' && orderItem.status !== 'Planned') {
        throw new Error('Only Forecasted and Planned order items can be deleted');
      }
      
      // Change status to Deleted (don't remove from array for tracking)
      orderItem.status = 'Deleted';
      orderItem.modifiedBy = userId;
      orderItem.modifiedOn = new Date().toISOString();
      if (!orderItem.history) orderItem.history = [];
      orderItem.history.push({
        action: 'Deleted',
        by: userId,
        date: new Date().toISOString()
      });
      
      return orderItem;
    }
    
    return this.dataverseService.updateOrderItem(orderItemId, {
      status: 'Deleted',
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Update order item delivery month
   */
  async updateOrderItemDeliveryMonth(orderItemId, newDeliveryMonth, userId = 'Ahmed Hassan') {
    logger.action('updateOrderItemDeliveryMonth called', {
      orderItemId,
      newDeliveryMonth,
      userId,
      useMock: this.useMock
    });
    
    if (this.useMock) {
      const orderItem = (this.mockData.orderItems || []).find(oi => oi.id === orderItemId);
      
      if (!orderItem) {
        logger.error('Order item not found', { orderItemId });
        throw new Error(`Order item ${orderItemId} not found`);
      }
      
      logger.data('Found order item', {
        orderItemId: orderItem.id,
        currentDeliveryMonth: orderItem.deliveryMonth,
        newDeliveryMonth,
        status: orderItem.status,
        qtyCartons: orderItem.qtyCartons
      });
      
      const oldMonth = orderItem.deliveryMonth;
      orderItem.deliveryMonth = newDeliveryMonth;
      orderItem.modifiedBy = userId;
      orderItem.modifiedOn = new Date().toISOString();
      
      if (!orderItem.history) orderItem.history = [];
      orderItem.history.push({
        action: `Delivery month changed from ${oldMonth} to ${newDeliveryMonth}`,
        by: userId,
        date: new Date().toISOString()
      });
      
      logger.success('Order item updated successfully', {
        orderItemId: orderItem.id,
        oldMonth,
        newMonth: orderItem.deliveryMonth,
        historyEntries: orderItem.history.length
      });
      
      return orderItem;
    }
    
    logger.network('Using Dataverse service to update order item');
    return this.dataverseService.updateOrderItem(orderItemId, {
      deliveryMonth: newDeliveryMonth,
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }
}

export default new OrderItemService(true); // Use mock by default

