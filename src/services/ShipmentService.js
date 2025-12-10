import { DataverseService, MockDataService } from './index.js';

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
   */
  async createShipment(shipmentData) {
    if (this.useMock) {
      const newShipment = {
        id: `SH-2025-${String(this.mockData.shipments.length + 1).padStart(3, '0')}`,
        shipmentNumber: `SHIP-${String(this.mockData.shipments.length + 1).padStart(4, '0')}`,
        ...shipmentData,
        status: 'In Transit',
        trackingNumber: `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };
      this.mockData.shipments.push(newShipment);
      return newShipment;
    }
    
    // In production, create in Dataverse
    return null;
  }

  /**
   * Update shipment status
   */
  async updateShipmentStatus(shipmentId, newStatus) {
    if (this.useMock) {
      const shipment = this.mockData.shipments.find(s => s.id === shipmentId);
      if (shipment) {
        shipment.status = newStatus;
        if (newStatus === 'Delivered') {
          shipment.deliveryDate = new Date().toISOString();
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

