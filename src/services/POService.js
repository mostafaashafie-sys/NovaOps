import DataverseDataService from './DataverseDataService.js';
import OrderItemService from './OrderItemService.js';
import { DataverseConfig } from '@/config/index.js';

/**
 * Purchase Order (PO) Service
 * Handles PO creation, approval workflow, and linking order items
 */
class POService {
  constructor() {
    this.dataverseService = DataverseDataService;
    this.orderItemService = OrderItemService;
  }

  /**
   * Get all POs with optional filters
   */
  async getPOs(filters = {}) {
    return await this.dataverseService.getPOs(filters);
  }

  /**
   * Get PO by ID
   */
  async getPOById(poId) {
    const po = await this.dataverseService.getPOById(poId);
    if (po) {
      // Enrich with order items using OrderItemService
      try {
        // Filter order items by orderId (PO lookup)
        const orderItems = await this.orderItemService.getOrderItems({ orderId: poId });
        po.orderItems = orderItems;
      } catch (err) {
        // If OrderItemService fails, continue without order items
        po.orderItems = [];
      }
    }
    return po || null;
  }

  /**
   * Create a new PO
   * @param {string[]} orderItemIds - Array of order item IDs to include in PO
   * @param {string} userId - User creating the PO
   * @param {string} poName - Name/ID for the PO (required)
   * @param {string} poDate - PO date (required, ISO date string)
   * @param {string} deliveryDate - Delivery date (required, ISO date string)
   */
  async createPO(orderItemIds = [], userId = 'Ahmed Hassan', poName = null, poDate = null, deliveryDate = null) {
    // Validate required fields
    if (!poName || poName.trim() === '') {
      throw new Error('PO name is required');
    }
    if (!poDate) {
      throw new Error('PO date is required');
    }
    if (!deliveryDate) {
      throw new Error('Delivery date is required');
    }
    
    // Get order items to validate and calculate totals
    let orderItems = [];
    if (orderItemIds.length > 0) {
      orderItems = await this.orderItemService.getOrderItems({});
      orderItems = orderItems.filter(oi => orderItemIds.includes(oi.id));
      
      // Validate all order items exist
      if (orderItems.length !== orderItemIds.length) {
        const missingIds = orderItemIds.filter(id => !orderItems.some(oi => oi.id === id));
        throw new Error(`Order items not found: ${missingIds.join(', ')}`);
      }
      
      // Validate: All order items must belong to the same country
      const countries = [...new Set(orderItems.map(oi => oi.countryId))];
      if (countries.length > 1) {
        const countryNames = countries.map(cid => {
          const oi = orderItems.find(oi => oi.countryId === cid);
          return oi?.countryName || cid;
        }).join(', ');
        throw new Error(`Cannot create PO: Order items belong to multiple countries (${countryNames}). A PO can only contain order items for one country.`);
      }
    }
    
    // For Dataverse, construct poData with all required fields
    const deliveryDateObj = new Date(deliveryDate);
    const poData = {
      name: poName.trim(),
      date: poDate,
      deliveryDate: deliveryDate,
      orderStatus: 100000000, // Open
      month: deliveryDateObj.getMonth() + 1,
      year: deliveryDateObj.getFullYear(),
      destinationId: countries[0] // Set destination to the country
    };
    
    const newPO = await this.dataverseService.createPO(poData);
    
    // Link order items to PO
    if (orderItems.length > 0) {
      await Promise.all(orderItems.map(oi => 
        this.orderItemService.updateOrderItem(oi.id, { orderId: newPO.id }, userId)
      ));
    }
    
    return newPO;
  }

  /**
   * Link order items to existing PO
   */
  async linkOrderItemsToPO(poId, orderItemIds, userId = 'Ahmed Hassan') {
    const po = await this.getPOById(poId);
    if (!po) {
      throw new Error('PO not found');
    }
    
    // Get existing and new order items
    const allOrderItems = await this.orderItemService.getOrderItems({});
    const existingOrderItems = allOrderItems.filter(oi => po.orderItemIds?.includes(oi.id));
    const existingCountry = existingOrderItems.length > 0 ? existingOrderItems[0].countryId : null;
    const newOrderItems = allOrderItems.filter(oi => orderItemIds.includes(oi.id));
    
    // Validate: All new order items must belong to the same country as existing PO items
    if (existingCountry) {
      const invalidItems = newOrderItems.filter(oi => oi.countryId !== existingCountry);
      if (invalidItems.length > 0) {
        const invalidCountryNames = [...new Set(invalidItems.map(oi => oi.countryName || oi.countryId))].join(', ');
        const poCountryName = existingOrderItems[0]?.countryName || existingCountry;
        throw new Error(`Cannot add order items to PO: PO ${poId} contains items for ${poCountryName}, but you are trying to add items for ${invalidCountryNames}. A PO can only contain order items for one country.`);
      }
    } else {
      // If PO has no items yet, validate all new items belong to same country
      const countries = [...new Set(newOrderItems.map(oi => oi.countryId))];
      if (countries.length > 1) {
        const countryNames = countries.map(cid => {
          const oi = newOrderItems.find(oi => oi.countryId === cid);
          return oi?.countryName || cid;
        }).join(', ');
        throw new Error(`Cannot create PO: Order items belong to multiple countries (${countryNames}). A PO can only contain order items for one country.`);
      }
    }
    
    // Update PO with new order item IDs
    const newOrderItemIds = [...new Set([...(po.orderItemIds || []), ...orderItemIds])];
    await this.dataverseService.updatePO(poId, { orderItemIds: newOrderItemIds });
    
    // Update order items to link to PO
    await Promise.all(orderItemIds.map(orderItemId => 
      this.orderItemService.updateOrderItem(orderItemId, { orderId: poId }, userId)
    ));
    
    return await this.getPOById(poId);
  }

  /**
   * Request PO approval (CFO approval)
   * Prerequisite: ALL order items in PO must have status "Regulatory Approved"
   */
  async requestPOApproval(poId, userId = 'Ahmed Hassan') {
    const po = await this.getPOById(poId);
    if (!po) {
      throw new Error('PO not found');
    }
    
    if (po.orderStatus !== 100000000) { // Open
      throw new Error('Only Open POs can be submitted for CFO approval');
    }
    
    if (!po.orderItems || po.orderItems.length === 0) {
      throw new Error('PO must have at least one order item');
    }

    // Check that ALL order items have status "RO Approved Pending CFO Approval" (100000003)
    const orderItems = po.orderItems;
    const allRegulatoryApproved = orderItems.every(oi => oi.orderPlacementStatus === 100000003);
    if (!allRegulatoryApproved) {
      const nonApprovedItems = orderItems.filter(oi => oi.orderPlacementStatus !== 100000003);
      throw new Error(`Cannot request CFO approval: ${nonApprovedItems.length} order item(s) are not RO Approved. All items must be RO Approved before requesting CFO approval.`);
    }
    
    return this.dataverseService.updatePO(poId, {
      orderStatus: 100000001 // Pending CFO Approval
    });
  }

  /**
   * Approve PO (CFO action)
   */
  async approvePO(poId, managerId = 'CFO User') {
    const po = await this.getPOById(poId);
    if (!po) {
      throw new Error('PO not found');
    }
    
    if (po.orderStatus !== 100000001) { // Pending CFO Approval
      throw new Error('Only POs with Pending CFO Approval status can be approved');
    }
    
    await this.dataverseService.updatePO(poId, {
      orderStatus: 100000002 // Approved
    });
    
    // Update all order items in PO to "Approved" status (100000004)
    if (po.orderItems && po.orderItems.length > 0) {
      await Promise.all(po.orderItems
        .filter(oi => oi.orderPlacementStatus === 100000003) // RO Approved Pending CFO Approval
        .map(oi => this.orderItemService.updateOrderItemStatus(oi.id, 100000004, managerId)) // Approved
      );
    }
    
    return await this.getPOById(poId);
  }

  /**
   * Reject PO (CFO action)
   */
  async rejectPO(poId, managerId = 'CFO User', reason = '') {
    const po = await this.getPOById(poId);
    if (!po) {
      throw new Error('PO not found');
    }
    
    if (po.orderStatus !== 100000001) { // Pending CFO Approval
      throw new Error('Only POs with Pending CFO Approval status can be rejected');
    }
    
    return this.dataverseService.updatePO(poId, {
      orderStatus: 100000000 // Open
    });
  }

  /**
   * Confirm PO to UP (LO action after CFO approval)
   * Changes ALL order items in PO to "Back Order" status
   */
  async confirmPOToUP(poId, userId = 'Ahmed Hassan') {
    const po = await this.getPOById(poId);
    if (!po) {
      throw new Error('PO not found');
    }
    
    if (po.orderStatus !== 100000002) { // Approved
      throw new Error('Only Approved POs can be confirmed to UP');
    }
    
    await this.dataverseService.updatePO(poId, {
      orderStatus: 100000004 // Confirmed to UP
    });
    
    // Update all order items in PO to "Confirmed to UP" (100000005)
    if (po.orderItems && po.orderItems.length > 0) {
      await Promise.all(po.orderItems
        .filter(oi => oi.orderPlacementStatus === 100000004) // Approved
        .map(oi => this.orderItemService.updateOrderItemStatus(oi.id, 100000005, userId)) // Confirmed to UP
      );
    }
    
    return await this.getPOById(poId);
  }

  /**
   * Check and update PO completion status
   * PO becomes "Completed" when all order items have status "Arrived to Market"
   */
  async checkAndUpdatePOCompletion(poId) {
    const po = await this.getPOById(poId);
    if (!po) {
      return null;
    }
    
    // Only check completion for POs that are "Confirmed to UP"
    if (po.orderStatus !== 100000004) { // Confirmed to UP
      return po;
    }
    
    // Get all order items for this PO
    const orderItems = po.orderItems || [];
    
    // Check if all items have arrived
    if (orderItems.length > 0) {
      // If all items are either Arrived or Deleted, mark PO as Completed
      const allFinalized = orderItems.every(oi => 
        oi.status === 'Arrived to Market' || oi.status === 'Deleted'
      );
      
      if (allFinalized) {
        await this.dataverseService.updatePO(poId, {
          status: 'Completed',
          modifiedOn: new Date().toISOString()
        });
        return await this.getPOById(poId);
      }
    }
    
    return po;
  }

  /**
   * Get PO summary (for manager approval view)
   */
  async getPOSummary(poId) {
    const po = await this.getPOById(poId);
    if (!po) return null;
    
    const orderItems = await this.orderItemService.getOrderItems({ orderId: poId });
    
    return {
      ...po,
      orderItems: orderItems,
      summary: {
        totalOrderItems: orderItems.length,
        totalQtyCartons: po.totalQtyCartons,
        countries: po.countries,
        skus: po.skus,
        deliveryMonths: [...new Set(orderItems.map(oi => oi.deliveryMonth))],
        byCountry: orderItems.reduce((acc, oi) => {
          if (!acc[oi.countryId]) acc[oi.countryId] = { name: oi.countryName, qty: 0, items: 0 };
          acc[oi.countryId].qty += oi.qtyCartons;
          acc[oi.countryId].items += 1;
          return acc;
        }, {}),
        bySKU: orderItems.reduce((acc, oi) => {
          if (!acc[oi.skuId]) acc[oi.skuId] = { name: oi.skuName, qty: 0, items: 0 };
          acc[oi.skuId].qty += oi.qtyCartons;
          acc[oi.skuId].items += 1;
          return acc;
        }, {})
      }
    };
  }
}

export default new POService();

