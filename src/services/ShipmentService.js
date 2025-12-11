import DataverseDataService from './DataverseDataService.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('ShipmentService');

/**
 * Shipment Service
 * Handles shipment-related business logic
 */
class ShipmentService {
  constructor() {
    this.dataverseService = DataverseDataService;
  }

  /**
   * Get shipments with optional filters
   */
  async getShipments(filters = {}) {
    return await this.dataverseService.getShipments(filters);
  }

  /**
   * Create shipment
   * Supports single orderItemId (legacy) or orderItemIds array (new)
   */
  async createShipment(shipmentData) {
    const orderItemIds = shipmentData.orderItemIds || (shipmentData.orderItemId ? [shipmentData.orderItemId] : []);
    
    const newShipment = {
      ...shipmentData,
      status: 100000001 // In Transit
    };
    
    const shipment = await this.dataverseService.createShipment(newShipment);
    
    // Link order items to shipment
    if (orderItemIds && orderItemIds.length > 0) {
      const OrderItemService = (await import('./OrderItemService.js')).default;
      await Promise.all(orderItemIds.map(orderItemId => 
        OrderItemService.updateOrderItem(orderItemId, { shippingId: shipment.id })
      ));
    }
    
    return shipment;
  }

  /**
   * Add order items to existing shipment
   */
  async addOrderItemsToShipment(shipmentId, orderItemIds, userId = 'Ahmed Hassan') {
    const shipment = await this.dataverseService.getShipmentById(shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }
    
    if (shipment.status !== 100000001) { // In Transit
      throw new Error('Can only add items to shipments with status "In Transit"');
    }
    
    // Link order items to shipment
    const OrderItemService = (await import('./OrderItemService.js')).default;
    await Promise.all(orderItemIds.map(orderItemId => 
      OrderItemService.updateOrderItem(orderItemId, { shippingId: shipmentId })
    ));
    
    return await this.dataverseService.getShipmentById(shipmentId);
  }

  /**
   * Update shipment status
   * Also updates order items and checks PO completion
   */
  async updateShipmentStatus(shipmentId, newStatus) {
    // Map status codes
    let statusCode;
    if (newStatus === 'Delivered' || newStatus === 'Received' || newStatus === 100000002) {
      statusCode = 100000002; // Delivered
    } else if (newStatus === 'In Transit' || newStatus === 100000001) {
      statusCode = 100000001; // In Transit
    } else {
      statusCode = newStatus;
    }
    
    const updateData = { status: statusCode };
    if (statusCode === 100000002) { // Delivered
      updateData.deliveryDate = new Date().toISOString();
      
      // Update linked order items to "Shipped To Market" (100000009)
      const shipment = await this.dataverseService.getShipmentById(shipmentId);
      if (shipment && shipment.orderItems) {
        const OrderItemService = (await import('./OrderItemService.js')).default;
        await Promise.all(shipment.orderItems.map(oi => 
          OrderItemService.updateOrderItemStatus(oi.id, 100000009) // Shipped To Market
        ));
      }
    }
    
    return await this.dataverseService.updateShipment(shipmentId, updateData);
  }

  /**
   * Get shipments by status
   */
  async getShipmentsByStatus(status) {
    return this.getShipments({ status });
  }
}

export default new ShipmentService();

