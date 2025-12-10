import DataverseService from './DataverseService.js';
import MockDataService from './MockDataService.js';
import OrderItemService from './OrderItemService.js';
import { DataverseConfig } from '@/config/index.js';

/**
 * Purchase Order (PO) Service
 * Handles PO creation, approval workflow, and linking order items
 */
class POService {
  constructor(useMock = true) {
    this.useMock = useMock;
    this.dataverseService = DataverseService;
    this.mockData = useMock ? MockDataService.generateMockData() : null;
    this.orderItemService = OrderItemService;
  }

  /**
   * Get all POs with optional filters
   */
  async getPOs(filters = {}) {
    if (this.useMock) {
      let pos = this.mockData.purchaseOrders || [];
      
      if (filters.status) {
        pos = pos.filter(po => po.status === filters.status);
      }
      if (filters.countryId) {
        pos = pos.filter(po => po.countries.includes(filters.countryId));
      }
      
      return pos;
    }
    
    return this.dataverseService.getPOs(filters);
  }

  /**
   * Get PO by ID
   */
  async getPOById(poId) {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (po && this.mockData.orderItems) {
        // Enrich with order items
        po.orderItems = (this.mockData.orderItems || []).filter(oi => oi.poId === poId);
      }
      return po || null;
    }
    
    return this.dataverseService.fetch(`/${DataverseConfig.tables.purchaseOrders}(${poId})`);
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
    if (this.useMock) {
      if (!this.mockData.orderItems) this.mockData.orderItems = [];
      
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
      
      // Check if PO name already exists
      const existingPO = (this.mockData.purchaseOrders || []).find(p => p.id === poName.trim());
      if (existingPO) {
        throw new Error(`PO with name "${poName}" already exists. Please choose a different name.`);
      }
      
      // Get order items to calculate totals
      const orderItems = this.mockData.orderItems.filter(oi => orderItemIds.includes(oi.id));
      if (orderItems.length === 0) {
        throw new Error('At least one order item is required to create a PO');
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
      
      const totalQtyCartons = orderItems.reduce((sum, oi) => sum + oi.qtyCartons, 0);
      const skus = [...new Set(orderItems.map(oi => oi.skuId))];
      
      const newPO = {
        id: poName.trim(),
        status: 'Draft', // Draft (1)
        orderItemIds: orderItemIds,
        totalQtyCartons: totalQtyCartons,
        countries: countries,
        skus: skus,
        poDate: poDate, // PO creation/issue date
        deliveryDate: deliveryDate, // Expected delivery date
        requestedBy: null,
        requestedOn: null,
        approvedBy: null,
        approvedOn: null,
        confirmedBy: null,
        confirmedOn: null,
        createdBy: userId,
        createdOn: new Date().toISOString(),
        modifiedBy: userId,
        modifiedOn: new Date().toISOString(),
        history: [{
          action: 'Created',
          by: userId,
          date: new Date().toISOString()
        }]
      };
      
      if (!this.mockData.purchaseOrders) this.mockData.purchaseOrders = [];
      this.mockData.purchaseOrders.push(newPO);
      
      // Link order items to PO
      orderItems.forEach(oi => {
        oi.poId = newPO.id;
      });
      
      return newPO;
    }
    
    // For Dataverse, construct poData with all required fields
    // Note: In production, orderItems would be fetched from Dataverse
    const poData = {
      id: poName.trim(),
      poDate: poDate,
      deliveryDate: deliveryDate,
      orderItemIds: orderItemIds,
      status: 'Draft',
      createdBy: userId,
      createdOn: new Date().toISOString()
    };
    return this.dataverseService.createPO(poData);
  }

  /**
   * Link order items to existing PO
   */
  async linkOrderItemsToPO(poId, orderItemIds, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        throw new Error('PO not found');
      }
      
      // Get existing order items in PO to check country
      const existingOrderItems = (this.mockData.orderItems || []).filter(oi => po.orderItemIds.includes(oi.id));
      const existingCountry = existingOrderItems.length > 0 ? existingOrderItems[0].countryId : null;
      
      // Get new order items to be added
      const newOrderItems = (this.mockData.orderItems || []).filter(oi => orderItemIds.includes(oi.id));
      
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
      
      // Add order items to PO
      const newOrderItemIds = [...new Set([...po.orderItemIds, ...orderItemIds])];
      const allOrderItems = (this.mockData.orderItems || []).filter(oi => newOrderItemIds.includes(oi.id));
      
      po.orderItemIds = newOrderItemIds;
      po.totalQtyCartons = allOrderItems.reduce((sum, oi) => sum + oi.qtyCartons, 0);
      po.countries = [...new Set(allOrderItems.map(oi => oi.countryId))];
      po.skus = [...new Set(allOrderItems.map(oi => oi.skuId))];
      po.modifiedBy = userId;
      po.modifiedOn = new Date().toISOString();
      
      // Update order items
      orderItemIds.forEach(orderItemId => {
        const orderItem = (this.mockData.orderItems || []).find(oi => oi.id === orderItemId);
        if (orderItem) {
          orderItem.poId = poId;
          orderItem.modifiedBy = userId;
          orderItem.modifiedOn = new Date().toISOString();
        }
      });
      
      return po;
    }
    
    return this.dataverseService.updatePO(poId, { orderItemIds });
  }

  /**
   * Request PO approval (CFO approval)
   * Prerequisite: ALL order items in PO must have status "Regulatory Approved"
   */
  async requestPOApproval(poId, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        throw new Error('PO not found');
      }
      
      if (po.status !== 'Draft') {
        throw new Error('Only Draft POs can be submitted for CFO approval');
      }
      
      if (!po.orderItemIds || po.orderItemIds.length === 0) {
        throw new Error('PO must have at least one order item');
      }

      // Check that ALL order items have status "Regulatory Approved"
      const orderItems = (this.mockData.orderItems || []).filter(oi => po.orderItemIds.includes(oi.id));
      if (orderItems.length === 0) {
        throw new Error('No order items found for this PO');
      }

      const allRegulatoryApproved = orderItems.every(oi => oi.status === 'Regulatory Approved');
      if (!allRegulatoryApproved) {
        const nonApprovedItems = orderItems.filter(oi => oi.status !== 'Regulatory Approved');
        throw new Error(`Cannot request CFO approval: ${nonApprovedItems.length} order item(s) are not Regulatory Approved. All items must be Regulatory Approved before requesting CFO approval.`);
      }
      
      po.status = 'Pending CFO Approval'; // Pending CFO Approval (2)
      po.requestedBy = userId;
      po.requestedOn = new Date().toISOString();
      po.modifiedBy = userId;
      po.modifiedOn = new Date().toISOString();
      if (!po.history) po.history = [];
      po.history.push({
        action: 'Pending CFO Approval',
        by: userId,
        date: new Date().toISOString()
      });
      
      return po;
    }
    
    return this.dataverseService.updatePO(poId, {
      status: 'Pending CFO Approval',
      requestedBy: userId,
      requestedOn: new Date().toISOString()
    });
  }

  /**
   * Approve PO (CFO action)
   */
  async approvePO(poId, managerId = 'CFO User') {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        throw new Error('PO not found');
      }
      
      if (po.status !== 'Pending CFO Approval') {
        throw new Error('Only POs with Pending CFO Approval status can be approved');
      }
      
      po.status = 'CFO Approved'; // CFO Approved (3)
      po.approvedBy = managerId;
      po.approvedOn = new Date().toISOString();
      po.modifiedBy = managerId;
      po.modifiedOn = new Date().toISOString();
      if (!po.history) po.history = [];
      po.history.push({
        action: 'CFO Approved',
        by: managerId,
        date: new Date().toISOString()
      });
      
      return po;
    }
    
    return this.dataverseService.updatePO(poId, {
      status: 'CFO Approved',
      approvedBy: managerId,
      approvedOn: new Date().toISOString()
    });
  }

  /**
   * Reject PO (CFO action)
   */
  async rejectPO(poId, managerId = 'CFO User', reason = '') {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        throw new Error('PO not found');
      }
      
      if (po.status !== 'Pending CFO Approval') {
        throw new Error('Only POs with Pending CFO Approval status can be rejected');
      }
      
      po.status = 'Draft'; // Rejected POs go back to Draft
      po.modifiedBy = managerId;
      po.modifiedOn = new Date().toISOString();
      if (!po.history) po.history = [];
      po.history.push({
        action: 'Rejected by CFO',
        by: managerId,
        date: new Date().toISOString(),
        reason: reason
      });
      
      return po;
    }
    
    return this.dataverseService.updatePO(poId, {
      status: 'Draft',
      modifiedBy: managerId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Confirm PO to UP (LO action after CFO approval)
   * Changes ALL order items in PO to "Back Order" status
   */
  async confirmPOToUP(poId, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        throw new Error('PO not found');
      }
      
      if (po.status !== 'CFO Approved') {
        throw new Error('Only CFO Approved POs can be confirmed to UP');
      }
      
      po.status = 'Confirmed to UP'; // Confirmed to UP (4)
      po.confirmedBy = userId;
      po.confirmedOn = new Date().toISOString();
      po.modifiedBy = userId;
      po.modifiedOn = new Date().toISOString();
      if (!po.history) po.history = [];
      po.history.push({
        action: 'Confirmed to UP',
        by: userId,
        date: new Date().toISOString()
      });
      
      // Update all order items in PO to "Back Order" (not "Confirmed to UP")
      if (this.mockData.orderItems) {
        this.mockData.orderItems
          .filter(oi => oi.poId === poId)
          .forEach(oi => {
            oi.status = 'Back Order';
            oi.modifiedBy = userId;
            oi.modifiedOn = new Date().toISOString();
            if (!oi.history) oi.history = [];
            oi.history.push({
              action: 'Confirmed to UP - Back Order',
              by: userId,
              date: new Date().toISOString()
            });
          });
      }
      
      return po;
    }
    
    return this.dataverseService.updatePO(poId, {
      status: 'Confirmed to UP',
      confirmedBy: userId,
      confirmedOn: new Date().toISOString()
    });
  }

  /**
   * Check and update PO completion status
   * PO becomes "Completed" when all order items have status "Arrived to Market"
   */
  async checkAndUpdatePOCompletion(poId) {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        return null;
      }
      
      // Only check completion for POs that are "Confirmed to UP"
      if (po.status !== 'Confirmed to UP') {
        return po;
      }
      
      // Get all order items for this PO
      const orderItems = (this.mockData.orderItems || []).filter(oi => oi.poId === poId);
      
      // Check if all items have arrived
      if (orderItems.length > 0) {
        const allArrived = orderItems.every(oi => oi.status === 'Arrived to Market');
        const hasDeleted = orderItems.some(oi => oi.status === 'Deleted');
        
        // If all items are either Arrived or Deleted, mark PO as Completed
        const allFinalized = orderItems.every(oi => 
          oi.status === 'Arrived to Market' || oi.status === 'Deleted'
        );
        
        if (allFinalized && orderItems.length > 0) {
          po.status = 'Completed'; // Completed (5)
          po.modifiedOn = new Date().toISOString();
          if (!po.history) po.history = [];
          po.history.push({
            action: 'Completed - All items arrived',
            by: 'System',
            date: new Date().toISOString()
          });
          
          return po;
        }
      }
      
      return po;
    }
    
    // In production, check via Dataverse
    return this.dataverseService.fetch(`/${DataverseConfig.tables.purchaseOrders}(${poId})`);
  }

  /**
   * Get PO summary (for manager approval view)
   */
  async getPOSummary(poId) {
    const po = await this.getPOById(poId);
    if (!po) return null;
    
    if (this.useMock && this.mockData.orderItems) {
      const orderItems = this.mockData.orderItems.filter(oi => oi.poId === poId);
      
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
    
    return po;
  }
}

export default new POService(true); // Use mock by default

