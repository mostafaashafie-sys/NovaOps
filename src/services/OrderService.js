import { DataverseService, MockDataService } from './index.js';

/**
 * Order Service
 * Handles all order-related business logic and API calls
 */
class OrderService {
  constructor(useMock = true) {
    this.useMock = useMock;
    this.dataverseService = DataverseService;
    this.mockData = useMock ? MockDataService.generateMockData() : null;
  }

  /**
   * Get all orders with optional filters
   */
  async getOrders(filters = {}) {
    if (this.useMock) {
      let orders = this.mockData.orders;
      
      if (filters.countryId) {
        orders = orders.filter(o => o.countryId === filters.countryId);
      }
      if (filters.skuId) {
        orders = orders.filter(o => o.skuId === filters.skuId);
      }
      if (filters.status) {
        orders = orders.filter(o => o.status === filters.status);
      }
      if (filters.fromDate) {
        orders = orders.filter(o => new Date(o.orderDate) >= new Date(filters.fromDate));
      }
      if (filters.toDate) {
        orders = orders.filter(o => new Date(o.orderDate) <= new Date(filters.toDate));
      }
      
      return orders;
    }
    
    return this.dataverseService.getOrders(filters);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId) {
    if (this.useMock) {
      return this.mockData.orders.find(o => o.id === orderId) || null;
    }
    
    return this.dataverseService.fetch(`/orders(${orderId})`);
  }

  /**
   * Create a new order
   */
  async createOrder(orderData) {
    if (this.useMock) {
      const newOrder = {
        id: `PO-2025-${String(this.mockData.orders.length + 1).padStart(3, '0')}`,
        ...orderData,
        status: 'Draft',
        createdOn: new Date().toISOString(),
        modifiedOn: new Date().toISOString(),
        createdBy: 'Ahmed Hassan',
        modifiedBy: 'Ahmed Hassan',
        history: [{ action: 'Created', by: 'Ahmed Hassan', date: new Date().toISOString() }]
      };
      this.mockData.orders.push(newOrder);
      return newOrder;
    }
    
    return this.dataverseService.createOrder(orderData);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus, userId = 'Ahmed Hassan') {
    if (this.useMock) {
      const order = this.mockData.orders.find(o => o.id === orderId);
      if (order) {
        order.status = newStatus;
        order.modifiedOn = new Date().toISOString();
        order.modifiedBy = userId;
        if (!order.history) order.history = [];
        order.history.push({
          action: newStatus,
          by: userId,
          date: new Date().toISOString()
        });
      }
      return order;
    }
    
    return this.dataverseService.updateOrder(orderId, { 
      status: newStatus,
      modifiedBy: userId,
      modifiedOn: new Date().toISOString()
    });
  }

  /**
   * Update order
   */
  async updateOrder(orderId, orderData) {
    if (this.useMock) {
      const order = this.mockData.orders.find(o => o.id === orderId);
      if (order) {
        Object.assign(order, orderData);
        order.modifiedOn = new Date().toISOString();
      }
      return order;
    }
    
    return this.dataverseService.updateOrder(orderId, orderData);
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status) {
    return this.getOrders({ status });
  }

  /**
   * Get orders by country
   */
  async getOrdersByCountry(countryId) {
    return this.getOrders({ countryId });
  }
}

export default new OrderService(true); // Use mock by default

