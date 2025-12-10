import DataverseService from './DataverseService.js';
import MockDataService from './MockDataService.js';
import OrderItemService from './OrderItemService.js';

/**
 * Allocation Service
 * Handles allocation-related business logic with support for partial allocation
 */
class AllocationService {
  constructor(useMock = true) {
    this.useMock = useMock;
    this.dataverseService = DataverseService;
    this.mockData = useMock ? MockDataService.generateMockData() : null;
    this.orderItemService = OrderItemService;
  }

  /**
   * Get allocations with optional filters
   */
  async getAllocations(filters = {}) {
    if (this.useMock) {
      let allocations = this.mockData.allocations || [];
      
      if (filters.countryId) {
        allocations = allocations.filter(a => a.countryId === filters.countryId);
      }
      if (filters.skuId) {
        allocations = allocations.filter(a => a.skuId === filters.skuId);
      }
      if (filters.orderItemId) {
        allocations = allocations.filter(a => a.orderItemId === filters.orderItemId);
      }
      if (filters.poId) {
        allocations = allocations.filter(a => a.poId === filters.poId);
      }
      
      return allocations;
    }
    
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
    if (this.useMock) {
      if (!this.mockData.orderItems) this.mockData.orderItems = [];
      if (!this.mockData.allocations) this.mockData.allocations = [];
      
      const orderItem = this.mockData.orderItems.find(oi => oi.id === orderItemId);
      if (!orderItem) {
        throw new Error('Order item not found');
      }
      
      if (orderItem.status !== 'Back Order') {
        throw new Error('Only order items with status "Back Order" can be allocated');
      }
      
      const remainingQty = orderItem.qtyCartons - allocatedQty;
      
      // Create allocation record
      const newAllocation = {
        id: `AL-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
        orderItem.status = 'Allocated to Market';
        orderItem.qtyCartons = allocatedQty; // Update quantity to allocated amount
      } else if (action === 'Push' && pushToMonth) {
        // Partial allocation + Push remaining
        // Allocated portion → Allocated to Market
        // Remaining portion → Back Order (pushed to new month)
        orderItem.status = 'Allocated to Market';
        orderItem.qtyCartons = allocatedQty; // Update quantity to allocated amount
        
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
        // Allocated portion → Allocated to Market
        // Remaining portion → Deleted
        orderItem.status = 'Allocated to Market';
        orderItem.qtyCartons = allocatedQty; // Reduce quantity to allocated amount
        newAllocation.remainingQty = 0;
        
        // Create a deleted order item record for tracking the removed quantity
        if (remainingQty > 0) {
          const deletedOrderItem = await this.orderItemService.createOrderItem({
            id: `DEL-${orderItemId}-${Date.now()}`,
            countryId: orderItem.countryId,
            countryName: orderItem.countryName,
            skuId: orderItem.skuId,
            skuName: orderItem.skuName,
            status: 'Deleted',
            qtyCartons: remainingQty,
            deliveryMonth: orderItem.deliveryMonth,
            poId: orderItem.poId, // Keep link to original PO
            originalOrderItemId: orderItemId,
            isSystemGenerated: false,
            channel: orderItem.channel || 'Private',
            tender: orderItem.tender || false,
            comments: `Removed from partial allocation of ${orderItem.id}`,
            createdBy: userId,
            createdOn: new Date().toISOString(),
            modifiedBy: userId,
            modifiedOn: new Date().toISOString(),
            history: [{
              action: 'Created from Partial Allocation - Removed',
              by: userId,
              date: new Date().toISOString(),
              originalOrderItemId: orderItemId
            }]
          });
          
          newAllocation.deletedOrderItemId = deletedOrderItem.id;
        }
      }
      
      // Update order item history
      if (!orderItem.history) orderItem.history = [];
      orderItem.history.push({
        action: `Allocated ${action === 'Full' ? 'Fully' : 'Partially'}`,
        by: userId,
        date: new Date().toISOString()
      });
      
      this.mockData.allocations.push(newAllocation);
      return newAllocation;
    }
    
    return this.dataverseService.createAllocation(newAllocation);
  }

  /**
   * Create allocation (legacy method for backward compatibility)
   */
  async createAllocation(data) {
    if (this.useMock) {
      const newAllocation = {
        id: `AL-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        ...data,
        status: data.status || 'Allocated',
        allocatedDate: data.allocatedDate || new Date().toISOString(),
        allocatedBy: data.allocatedBy || 'Ahmed Hassan',
        allocatedOn: data.allocatedOn || new Date().toISOString()
      };
      if (!this.mockData.allocations) this.mockData.allocations = [];
      this.mockData.allocations.push(newAllocation);
      return newAllocation;
    }
    
    return this.dataverseService.createAllocation(data);
  }
}

export default new AllocationService(true); // Use mock by default

