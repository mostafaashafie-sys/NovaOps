import { DataverseService, MockDataService, OrderItemService } from './index.js';

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
      
      if (orderItem.status !== 'Confirmed to UP') {
        throw new Error('Only order items with status "Confirmed to UP" can be allocated');
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
        status: action === 'Full' ? 'Fully Allocated' : 'Partially Allocated',
        allocatedBy: userId,
        allocatedOn: new Date().toISOString()
      };
      
      if (action === 'Full') {
        // Full allocation
        orderItem.status = 'Fully Allocated';
        newAllocation.status = 'Fully Allocated';
      } else if (action === 'Partial') {
        // Partial allocation - user will choose push or remove next
        orderItem.status = 'Partially Allocated';
        newAllocation.status = 'Partially Allocated';
      } else if (action === 'Push' && pushToMonth) {
        // Push remaining to different month
        orderItem.status = 'Partially Allocated';
        newAllocation.status = 'Partially Allocated';
        
        // Create new order item for pushed quantity
        const pushedOrderItem = await this.orderItemService.createOrderItemFromPush(
          orderItemId,
          pushToMonth,
          remainingQty,
          userId
        );
        
        newAllocation.pushedToOrderItemId = pushedOrderItem.id;
      } else if (action === 'Remove') {
        // Remove remaining quantity
        orderItem.qtyCartons = allocatedQty; // Reduce quantity
        orderItem.status = 'Fully Allocated';
        newAllocation.status = 'Fully Allocated';
        newAllocation.remainingQty = 0;
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

