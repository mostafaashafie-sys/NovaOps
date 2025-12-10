import DataverseService from './DataverseService.js';
import MockDataService from './MockDataService.js';

/**
 * Shipment Service
 * Handles shipment-related business logic
 */
class ShipmentService {
  constructor(useMock = true) {
    this.useMock = useMock;
    this.dataverseService = DataverseService;
    this.mockData = useMock ? MockDataService.generateMockData() : null;
  }

  /**
   * Get shipments with optional filters
   */
  async getShipments(filters = {}) {
    if (this.useMock) {
      let shipments = this.mockData.shipments;
      
      if (filters.countryId) {
        shipments = shipments.filter(s => s.countryId === filters.countryId);
      }
      if (filters.status) {
        shipments = shipments.filter(s => s.status === filters.status);
      }
      
      return shipments;
    }
    
    return this.dataverseService.getShipments(filters);
  }

  /**
   * Create shipment
   * Supports single orderItemId (legacy) or orderItemIds array (new)
   */
  async createShipment(shipmentData) {
    if (this.useMock) {
      const orderItemIds = shipmentData.orderItemIds || (shipmentData.orderItemId ? [shipmentData.orderItemId] : []);
      
      const newShipment = {
        id: `SH-2025-${String(this.mockData.shipments.length + 1).padStart(3, '0')}`,
        shipmentNumber: `SHIP-${String(this.mockData.shipments.length + 1).padStart(4, '0')}`,
        ...shipmentData,
        orderItemIds: orderItemIds, // Array of order item IDs
        orderItemId: orderItemIds[0] || shipmentData.orderItemId, // Keep for backward compatibility
        status: 'Shipped to Market',
        trackingNumber: `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };
      
      // Update order items to "Shipped to Market"
      if (this.mockData.orderItems && orderItemIds.length > 0) {
        orderItemIds.forEach(orderItemId => {
          const orderItem = this.mockData.orderItems.find(oi => oi.id === orderItemId);
          if (orderItem && orderItem.status === 'Allocated to Market') {
            orderItem.status = 'Shipped to Market';
            orderItem.modifiedOn = new Date().toISOString();
            if (!orderItem.history) orderItem.history = [];
            orderItem.history.push({
              action: 'Shipped to Market',
              by: shipmentData.createdBy || 'System',
              date: new Date().toISOString(),
              shipmentId: newShipment.id
            });
          }
        });
      }
      
      this.mockData.shipments.push(newShipment);
      return newShipment;
    }
    
    // In production, create in Dataverse
    return null;
  }

  /**
   * Add order items to existing shipment
   */
  async addOrderItemsToShipment(shipmentId, orderItemIds, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const shipment = this.mockData.shipments.find(s => s.id === shipmentId);
      if (!shipment) {
        throw new Error('Shipment not found');
      }
      
      if (shipment.status !== 'Shipped to Market') {
        throw new Error('Can only add items to shipments with status "Shipped to Market"');
      }
      
      // Add order item IDs to shipment
      const existingIds = shipment.orderItemIds || (shipment.orderItemId ? [shipment.orderItemId] : []);
      shipment.orderItemIds = [...new Set([...existingIds, ...orderItemIds])];
      
      // Update order items to "Shipped to Market"
      if (this.mockData.orderItems && orderItemIds.length > 0) {
        orderItemIds.forEach(orderItemId => {
          const orderItem = this.mockData.orderItems.find(oi => oi.id === orderItemId);
          if (orderItem && orderItem.status === 'Allocated to Market') {
            orderItem.status = 'Shipped to Market';
            orderItem.modifiedOn = new Date().toISOString();
            if (!orderItem.history) orderItem.history = [];
            orderItem.history.push({
              action: 'Added to Shipment',
              by: userId,
              date: new Date().toISOString(),
              shipmentId: shipment.id
            });
          }
        });
      }
      
      return shipment;
    }
    
    // In production, update in Dataverse
    return null;
  }

  /**
   * Update shipment status
   * Also updates order items and checks PO completion
   */
  async updateShipmentStatus(shipmentId, newStatus) {
    if (this.useMock) {
      const shipment = this.mockData.shipments.find(s => s.id === shipmentId);
      if (shipment) {
        // Map old status names to new ones if needed
        if (newStatus === 'Delivered' || newStatus === 'Received') {
          shipment.status = 'Arrived to Market';
        } else if (newStatus === 'Shipped to Market' || newStatus === 'In Transit') {
          shipment.status = 'Shipped to Market';
        } else {
          shipment.status = newStatus;
        }
        
        if (shipment.status === 'Arrived to Market') {
          shipment.deliveryDate = new Date().toISOString();
          
          // Update order items in this shipment to "Arrived to Market"
          const orderItemIds = shipment.orderItemIds || (shipment.orderItemId ? [shipment.orderItemId] : []);
          const completedPOIds = new Set();
          
          if (this.mockData.orderItems && orderItemIds.length > 0) {
            orderItemIds.forEach(orderItemId => {
              const orderItem = this.mockData.orderItems.find(oi => oi.id === orderItemId);
              if (orderItem && orderItem.status === 'Shipped to Market') {
                orderItem.status = 'Arrived to Market';
                orderItem.modifiedOn = new Date().toISOString();
                if (!orderItem.history) orderItem.history = [];
                orderItem.history.push({
                  action: 'Arrived to Market',
                  by: 'System',
                  date: new Date().toISOString()
                });
                
                // Track PO IDs to check completion
                if (orderItem.poId) {
                  completedPOIds.add(orderItem.poId);
                }
              }
            });
          }
          
          // Check PO completion for all affected POs
          if (completedPOIds.size > 0) {
            completedPOIds.forEach(poId => {
              POService.checkAndUpdatePOCompletion(poId);
            });
          }
          
          // Update shipment status to "Completed" if all items arrived
          const allItemsArrived = orderItemIds.every(orderItemId => {
            const item = this.mockData.orderItems.find(oi => oi.id === orderItemId);
            return item && item.status === 'Arrived to Market';
          });
          
          if (allItemsArrived && orderItemIds.length > 0) {
            shipment.status = 'Completed';
            if (!shipment.history) shipment.history = [];
            shipment.history.push({
              action: 'Completed - All items arrived',
              by: 'System',
              date: new Date().toISOString()
            });
          }
        }
      }
      return shipment;
    }
    
    // In production, update in Dataverse
    return null;
  }

  /**
   * Get shipments by status
   */
  async getShipmentsByStatus(status) {
    return this.getShipments({ status });
  }
}

export default new ShipmentService(true); // Use mock by default

