import { DataverseService, MockDataService } from './index.js';
import { DataverseConfig } from '../config/index.js';

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
        status: 'Planned',
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
   * Get order items confirmed to UP
   */
  async getConfirmedToUPOrderItems(filters = {}) {
    return this.getOrderItems({ ...filters, status: 'Confirmed to UP' });
  }
}

export default new OrderItemService(true); // Use mock by default

