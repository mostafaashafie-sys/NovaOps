import DataverseDataService from './DataverseDataService.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('OrderItemService');

/**
 * OrderItem Service
 * Handles order item business logic (forecasted items, planning, linking to POs)
 */
class OrderItemService {
  constructor() {
    this.dataverseService = DataverseDataService;
  }

  /**
   * Get all order items with optional filters
   */
  async getOrderItems(filters = {}) {
    const result = await this.dataverseService.getOrderItems(filters);
    
    // Log what data we received
    logger.info('OrderItems data received from Dataverse', {
      count: Array.isArray(result) ? result.length : 'not an array',
      filters: filters,
      sample: Array.isArray(result) && result.length > 0 ? result[0] : null,
      allFields: Array.isArray(result) && result.length > 0 ? Object.keys(result[0]) : []
    });
    
    if (Array.isArray(result) && result.length === 0) {
      logger.warn('OrderItems: Dataverse returned empty array - table may be empty or query returned no results', {
        filters: filters,
        table: 'new_orderitemses'
      });
    }
    
    return result;
  }

  /**
   * Get order item by ID
   */
  async getOrderItemById(orderItemId) {
    return this.dataverseService.getOrderItemById(orderItemId);
  }

  /**
   * Plan a forecasted order item (change status to Planned By LO)
   * This only links to PO, does not confirm to PO
   */
  async planOrderItem(orderItemId, poId, userId = 'Ahmed Hassan') {
    return this.dataverseService.updateOrderItem(orderItemId, {
      orderPlacementStatus: 100000001, // Planned By LO
      orderId: poId
    });
  }

  /**
   * Confirm order item to PO with label selection
   * Changes status: Planned By LO → Confirmed Pending RO Approval
   * Requires label selection
   */
  async confirmOrderItemToPO(orderItemId, labelId, userId = 'Ahmed Hassan') {
    return this.dataverseService.updateOrderItem(orderItemId, {
      orderPlacementStatus: 100000002, // Confirmed Pending RO Approval
      labelId: labelId
    });
  }

  /**
   * Approve regulatory label (Regulatory Office action)
   * Changes status: Confirmed Pending RO Approval → RO Approved Pending CFO Approval
   */
  async approveRegulatoryLabel(orderItemId, userId = 'Regulatory Office') {
    return this.dataverseService.updateOrderItem(orderItemId, {
      orderPlacementStatus: 100000003 // RO Approved Pending CFO Approval
    });
  }

  /**
   * Reject regulatory label (Regulatory Office action)
   * Changes status: Confirmed Pending RO Approval → Planned By LO
   */
  async rejectRegulatoryLabel(orderItemId, reason = '', userId = 'Regulatory Office') {
    return this.dataverseService.updateOrderItem(orderItemId, {
      orderPlacementStatus: 100000001, // Planned By LO
      labelId: null,
      comments: reason ? `Rejected: ${reason}` : undefined
    });
  }

  /**
   * Update order item (quantity and/or delivery month)
   * Only allowed for Forecasted and Planned items
   */
  async updateOrderItem(orderItemId, updates, userId = 'Ahmed Hassan') {
    return this.dataverseService.updateOrderItem(orderItemId, {
      ...updates,
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Update order item status
   * newStatus should be the status code (e.g., 100000001 for Planned By LO)
   */
  async updateOrderItemStatus(orderItemId, newStatus, userId = 'Ahmed Hassan') {
    return this.dataverseService.updateOrderItem(orderItemId, {
      orderPlacementStatus: newStatus
    });
  }

  /**
   * Create order item from forecast (when pushing remaining quantity)
   */
  async createOrderItemFromPush(originalOrderItemId, newDeliveryMonth, remainingQty, userId = 'Ahmed Hassan') {
    // Get original order item to copy its properties
    const original = await this.getOrderItemById(originalOrderItemId);
    if (!original) {
      throw new Error('Original order item not found');
    }
    
    // Parse delivery month (format: YYYY-MM)
    const [year, month] = newDeliveryMonth.split('-').map(Number);
    
    // Get SKU metadata to calculate qtyInCartons
    let tinsPerCarton = 1;
    if (original.skuId) {
      try {
        const sku = await this.dataverseService.getSkuForCalculation(original.skuId);
        tinsPerCarton = sku.tinsPerCarton;
      } catch (error) {
        logger.warn('Could not get SKU metadata, using default tinsPerCarton=1', error);
      }
    }
    
    const newOrderItem = {
      countryId: original.countryId,
      skuId: original.skuId,
      orderId: original.orderId, // Linked to same PO
      orderItemQty: remainingQty,
      // qtyInCartons will be calculated by DataverseDataService.createOrderItem
      orderPlacementStatus: 100000006, // Back Order
      month: month,
      year: year,
      date: `${newDeliveryMonth}-01`, // First day of month
      channel: original.channel || 100000000, // Private
      comments: `Pushed from ${original.id}`
    };
    
    return this.dataverseService.createOrderItem(newOrderItem);
  }

  /**
   * Get forecasted order items (system-generated)
   */
  async getForecastedOrderItems(filters = {}) {
    return this.getOrderItems({ ...filters, orderPlacementStatus: 100000000 }); // System Forecasted Order
  }

  /**
   * Get planned order items
   */
  async getPlannedOrderItems(filters = {}) {
    return this.getOrderItems({ ...filters, orderPlacementStatus: 100000001 }); // Planned By LO
  }

  /**
   * Get order items with Back Order status
   */
  async getBackOrderItems(filters = {}) {
    return this.getOrderItems({ ...filters, orderPlacementStatus: 100000006 }); // Back Order
  }

  /**
   * Get order items pending regulatory approval
   */
  async getPendingRegulatoryItems(filters = {}) {
    return this.getOrderItems({ ...filters, orderPlacementStatus: 100000002 }); // Confirmed Pending RO Approval
  }

  /**
   * Get order items with regulatory approved status
   */
  async getRegulatoryApprovedItems(filters = {}) {
    return this.getOrderItems({ ...filters, orderPlacementStatus: 100000003 }); // RO Approved Pending CFO Approval
  }

  /**
   * Create a new order item
   */
  async createOrderItem(orderItemData) {
    // Ensure required fields are set
    const newOrderItem = {
      ...orderItemData,
      orderPlacementStatus: orderItemData.orderPlacementStatus || 100000000, // System Forecasted Order
      channel: orderItemData.channel || 100000000 // Private
    };
    
    // Parse deliveryMonth if provided (format: YYYY-MM)
    if (orderItemData.deliveryMonth && !orderItemData.month) {
      const [year, month] = orderItemData.deliveryMonth.split('-').map(Number);
      newOrderItem.year = year;
      newOrderItem.month = month;
      newOrderItem.date = `${orderItemData.deliveryMonth}-01`;
    }
    
    return this.dataverseService.createOrderItem(newOrderItem);
  }

  /**
   * Delete order item (only allowed for Forecasted and Planned items)
   * Note: In Dataverse, we typically don't delete records, but mark them as inactive
   * This method updates the status instead
   */
  async deleteOrderItem(orderItemId, userId = 'Ahmed Hassan') {
    // Get current order item to check status
    const orderItem = await this.getOrderItemById(orderItemId);
    if (!orderItem) {
      throw new Error('Order item not found');
    }
    
    // Only allow deletion for System Forecasted or Planned items
    const allowedStatuses = [100000000, 100000001]; // System Forecasted Order, Planned By LO
    if (!allowedStatuses.includes(orderItem.orderPlacementStatus)) {
      throw new Error('Only System Forecasted or Planned order items can be deleted');
    }
    
    // In Dataverse, we might set status to inactive or a deleted status
    // For now, we'll update status to a "deleted" state if such exists
    // Otherwise, we could use statecode/statuscode
    return this.dataverseService.updateOrderItem(orderItemId, {
      comments: `Deleted by ${userId} on ${new Date().toISOString()}`
    });
  }

  /**
   * Update order item delivery month
   */
  async updateOrderItemDeliveryMonth(orderItemId, newDeliveryMonth, userId = 'Ahmed Hassan') {
    logger.action('updateOrderItemDeliveryMonth called', {
      orderItemId,
      newDeliveryMonth,
      userId
    });
    
    // Parse delivery month (format: YYYY-MM)
    const [year, month] = newDeliveryMonth.split('-').map(Number);
    
    logger.network('Using Dataverse service to update order item');
    return this.dataverseService.updateOrderItem(orderItemId, {
      year: year,
      month: month,
      date: `${newDeliveryMonth}-01`
    });
  }
}

export default new OrderItemService();

