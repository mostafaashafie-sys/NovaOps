import { DataverseService, MockDataService, OrderItemService } from './index.js';
import { DataverseConfig } from '../config/index.js';

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
   */
  async createPO(orderItemIds = [], userId = 'Ahmed Hassan') {
    if (this.useMock) {
      if (!this.mockData.orderItems) this.mockData.orderItems = [];
      
      // Get order items to calculate totals
      const orderItems = this.mockData.orderItems.filter(oi => orderItemIds.includes(oi.id));
      if (orderItems.length === 0) {
        throw new Error('At least one order item is required to create a PO');
      }
      
      const totalQtyCartons = orderItems.reduce((sum, oi) => sum + oi.qtyCartons, 0);
      const countries = [...new Set(orderItems.map(oi => oi.countryId))];
      const skus = [...new Set(orderItems.map(oi => oi.skuId))];
      
      const poNumber = (this.mockData.purchaseOrders || []).length + 1;
      const newPO = {
        id: `PO-2025-${String(poNumber).padStart(3, '0')}`,
        status: 'Draft',
        orderItemIds: orderItemIds,
        totalQtyCartons: totalQtyCartons,
        countries: countries,
        skus: skus,
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
   * Request PO approval
   */
  async requestPOApproval(poId, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        throw new Error('PO not found');
      }
      
      if (po.status !== 'Draft') {
        throw new Error('Only Draft POs can be submitted for approval');
      }
      
      if (!po.orderItemIds || po.orderItemIds.length === 0) {
        throw new Error('PO must have at least one order item');
      }
      
      po.status = 'Approval Requested';
      po.requestedBy = userId;
      po.requestedOn = new Date().toISOString();
      po.modifiedBy = userId;
      po.modifiedOn = new Date().toISOString();
      if (!po.history) po.history = [];
      po.history.push({
        action: 'Approval Requested',
        by: userId,
        date: new Date().toISOString()
      });
      
      return po;
    }
    
    return this.dataverseService.updatePO(poId, {
      status: 'Approval Requested',
      requestedBy: userId,
      requestedOn: new Date().toISOString()
    });
  }

  /**
   * Approve PO (Manager action)
   */
  async approvePO(poId, managerId = 'Manager User') {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        throw new Error('PO not found');
      }
      
      if (po.status !== 'Approval Requested') {
        throw new Error('Only POs with Approval Requested status can be approved');
      }
      
      po.status = 'Approved';
      po.approvedBy = managerId;
      po.approvedOn = new Date().toISOString();
      po.modifiedBy = managerId;
      po.modifiedOn = new Date().toISOString();
      if (!po.history) po.history = [];
      po.history.push({
        action: 'Approved',
        by: managerId,
        date: new Date().toISOString()
      });
      
      return po;
    }
    
    return this.dataverseService.updatePO(poId, {
      status: 'Approved',
      approvedBy: managerId,
      approvedOn: new Date().toISOString()
    });
  }

  /**
   * Reject PO (Manager action)
   */
  async rejectPO(poId, managerId = 'Manager User', reason = '') {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        throw new Error('PO not found');
      }
      
      if (po.status !== 'Approval Requested') {
        throw new Error('Only POs with Approval Requested status can be rejected');
      }
      
      po.status = 'Rejected';
      po.modifiedBy = managerId;
      po.modifiedOn = new Date().toISOString();
      if (!po.history) po.history = [];
      po.history.push({
        action: 'Rejected',
        by: managerId,
        date: new Date().toISOString(),
        reason: reason
      });
      
      return po;
    }
    
    return this.dataverseService.updatePO(poId, {
      status: 'Rejected',
      modifiedBy: managerId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Confirm PO to UP (LO action after approval)
   */
  async confirmPOToUP(poId, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const po = (this.mockData.purchaseOrders || []).find(p => p.id === poId);
      if (!po) {
        throw new Error('PO not found');
      }
      
      if (po.status !== 'Approved') {
        throw new Error('Only Approved POs can be confirmed to UP');
      }
      
      po.status = 'Confirmed to UP';
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
      
      // Update all order items in PO to "Confirmed to UP"
      if (this.mockData.orderItems) {
        this.mockData.orderItems
          .filter(oi => oi.poId === poId)
          .forEach(oi => {
            oi.status = 'Confirmed to UP';
            oi.modifiedBy = userId;
            oi.modifiedOn = new Date().toISOString();
            if (!oi.history) oi.history = [];
            oi.history.push({
              action: 'Confirmed to UP',
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

