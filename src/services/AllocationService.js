import DataverseDataService from './DataverseDataService.js';
import OrderItemService from './OrderItemService.js';

/**
 * Allocation Service
 * Handles allocation-related business logic with support for partial allocation
 */
class AllocationService {
  constructor() {
    this.dataverseService = DataverseDataService;
    this.orderItemService = OrderItemService;
  }

  /**
   * Get allocations with optional filters
   */
  async getAllocations(filters = {}) {
    return this.dataverseService.getAllocations(filters);
  }

  /**
   * Allocate order item (full or partial)
   * @param {string} orderItemId - Order item to allocate
   * @param {number} allocatedQty - Quantity to allocate
   * @param {string} allocationMonth - Month to allocate to
   * @param {string} action - 'Full' | 'Partial' | 'Push' | 'Remove'
   * @param {string} pushToMonth - If action is 'Push', the target month
   * @param {string} userId - User performing the allocation
   */
  async allocateOrderItem(orderItemId, allocatedQty, allocationMonth, action = 'Full', pushToMonth = null, userId = 'Ahmed Hassan') {
    const orderItem = await this.orderItemService.getOrderItemById(orderItemId);
    if (!orderItem) {
      throw new Error('Order item not found');
    }
    
    if (orderItem.status !== 'Back Order') {
      throw new Error('Only order items with status "Back Order" can be allocated');
    }
    
    const remainingQty = orderItem.qtyCartons - allocatedQty;
    
    // Create allocation record
    const newAllocation = {
      orderItemId: orderItemId,
      poId: orderItem.poId,
      countryId: orderItem.countryId,
      countryName: orderItem.countryName,
      skuId: orderItem.skuId,
      skuName: orderItem.skuName,
      allocatedQty: allocatedQty,
      remainingQty: remainingQty,
      allocationMonth: allocationMonth,
      action: action,
      pushedToOrderItemId: null,
      allocatedDate: new Date().toISOString(),
      status: 'Allocated to Market',
      allocatedBy: userId,
      allocatedOn: new Date().toISOString()
    };
    
    if (action === 'Full') {
      // Full allocation → Allocated to Market
      await this.orderItemService.updateOrderItem(orderItemId, {
        status: 'Allocated to Market',
        qtyCartons: allocatedQty
      }, userId);
    } else if (action === 'Push' && pushToMonth) {
      // Partial allocation + Push remaining
      await this.orderItemService.updateOrderItem(orderItemId, {
        status: 'Allocated to Market',
        qtyCartons: allocatedQty
      }, userId);
      
      // Create new order item for pushed quantity (status: Back Order)
      const pushedOrderItem = await this.orderItemService.createOrderItemFromPush(
        orderItemId,
        pushToMonth,
        remainingQty,
        userId
      );
      
      newAllocation.pushedToOrderItemId = pushedOrderItem.id;
    } else if (action === 'Remove') {
      // Partial allocation + Remove remaining
      await this.orderItemService.updateOrderItem(orderItemId, {
        status: 'Allocated to Market',
        qtyCartons: allocatedQty
      }, userId);
      newAllocation.remainingQty = 0;
      
      // Create a deleted order item record for tracking the removed quantity
      if (remainingQty > 0) {
        const deletedOrderItem = await this.orderItemService.createOrderItem({
          countryId: orderItem.countryId,
          countryName: orderItem.countryName,
          skuId: orderItem.skuId,
          skuName: orderItem.skuName,
          status: 'Deleted',
          qtyCartons: remainingQty,
          deliveryMonth: orderItem.deliveryMonth,
          poId: orderItem.poId,
          originalOrderItemId: orderItemId,
          isSystemGenerated: false,
          channel: orderItem.channel || 'Private',
          tender: orderItem.tender || false,
          comments: `Removed from partial allocation of ${orderItem.id}`,
          createdBy: userId
        });
        
        newAllocation.deletedOrderItemId = deletedOrderItem.id;
      }
    }
    
    return this.dataverseService.createAllocation(newAllocation);
  }

  /**
   * Create allocation (legacy method for backward compatibility)
   */
  async createAllocation(data) {
    const newAllocation = {
      ...data,
      status: data.status || 'Allocated',
      allocatedDate: data.allocatedDate || new Date().toISOString(),
      allocatedBy: data.allocatedBy || 'Ahmed Hassan',
      allocatedOn: data.allocatedOn || new Date().toISOString()
    };
    
    return this.dataverseService.createAllocation(newAllocation);
  }
}

export default new AllocationService();

