import { DataverseConfig } from '../config/index.js';

/**
 * Dataverse API Service
 * Handles all communication with Microsoft Dataverse
 */
class DataverseService {
  constructor() {
    this.baseUrl = DataverseConfig.baseUrl;
    this.token = null;
  }

  /**
   * Get access token from Azure AD
   * In production: Use MSAL to get token from Azure AD
   */
  async getAccessToken() {
    if (this.token) return this.token;
    // NOTE: In production, implement MSAL authentication here
    // For now, using mock token for development
    this.token = 'mock-token';
    return this.token;
  }

  /**
   * Generic fetch method with authentication
   */
  async fetch(endpoint, options = {}) {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Prefer': 'return=representation',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`Dataverse API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get countries
   */
  async getCountries() {
    return this.fetch(
      `/${DataverseConfig.tables.countries}?$select=new_countryid,new_name,new_region,new_currency`
    );
  }

  /**
   * Get SKUs
   */
  async getSKUs(countryId = null) {
    let filter = countryId 
      ? `&$filter=_new_countryid_value eq ${countryId}` 
      : '';
    return this.fetch(
      `/${DataverseConfig.tables.skus}?$select=new_skuid,new_name,new_category,new_tinsize,new_tinspercarton,new_status${filter}`
    );
  }

  /**
   * Get orders with filters
   */
  async getOrders(filters = {}) {
    let filterStr = [];
    if (filters.countryId) filterStr.push(`_new_countryid_value eq ${filters.countryId}`);
    if (filters.skuId) filterStr.push(`_new_skuid_value eq ${filters.skuId}`);
    if (filters.status) filterStr.push(`new_status eq ${filters.status}`);
    if (filters.fromDate) filterStr.push(`new_orderdate ge ${filters.fromDate}`);
    if (filters.toDate) filterStr.push(`new_orderdate le ${filters.toDate}`);
    
    const filter = filterStr.length > 0 ? `&$filter=${filterStr.join(' and ')}` : '';
    return this.fetch(
      `/${DataverseConfig.tables.orders}?$expand=new_CountryId,new_SKUId${filter}&$orderby=new_orderdate desc`
    );
  }

  /**
   * Create a new order
   */
  async createOrder(orderData) {
    return this.fetch(`/${DataverseConfig.tables.orders}`, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  /**
   * Update an existing order
   */
  async updateOrder(orderId, orderData) {
    return this.fetch(`/${DataverseConfig.tables.orders}(${orderId})`, {
      method: 'PATCH',
      body: JSON.stringify(orderData)
    });
  }

  /**
   * Get forecasts with filters
   */
  async getForecasts(filters = {}) {
    let filterStr = [];
    if (filters.countryId) filterStr.push(`_new_countryid_value eq ${filters.countryId}`);
    if (filters.skuId) filterStr.push(`_new_skuid_value eq ${filters.skuId}`);
    if (filters.year) filterStr.push(`new_year eq ${filters.year}`);
    
    const filter = filterStr.length > 0 ? `&$filter=${filterStr.join(' and ')}` : '';
    return this.fetch(
      `/${DataverseConfig.tables.forecasts}?$expand=new_CountryId,new_SKUId${filter}`
    );
  }

  /**
   * Update forecast
   */
  async updateForecast(forecastId, data) {
    return this.fetch(`/${DataverseConfig.tables.forecasts}(${forecastId})`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get allocations with filters
   */
  async getAllocations(filters = {}) {
    let filterStr = [];
    if (filters.countryId) filterStr.push(`_new_countryid_value eq ${filters.countryId}`);
    if (filters.skuId) filterStr.push(`_new_skuid_value eq ${filters.skuId}`);
    
    const filter = filterStr.length > 0 ? `&$filter=${filterStr.join(' and ')}` : '';
    return this.fetch(
      `/${DataverseConfig.tables.allocations}?$expand=new_CountryId,new_SKUId,new_OrderId${filter}`
    );
  }

  /**
   * Create allocation
   */
  async createAllocation(data) {
    return this.fetch(`/${DataverseConfig.tables.allocations}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get shipments with filters
   */
  async getShipments(filters = {}) {
    let filterStr = [];
    if (filters.countryId) filterStr.push(`_new_destinationcountryid_value eq ${filters.countryId}`);
    if (filters.status) filterStr.push(`new_status eq ${filters.status}`);
    
    const filter = filterStr.length > 0 ? `&$filter=${filterStr.join(' and ')}` : '';
    return this.fetch(
      `/${DataverseConfig.tables.shipments}?$expand=new_DestinationCountryId${filter}&$orderby=new_deliverydate desc`
    );
  }

  /**
   * Get inventory
   */
  async getInventory(countryId, skuId) {
    return this.fetch(
      `/${DataverseConfig.tables.inventory}?$filter=_new_countryid_value eq ${countryId} and _new_skuid_value eq ${skuId}&$orderby=new_date desc&$top=1`
    );
  }

  /**
   * Calculate months cover
   * This would typically call an Azure Function
   */
  async calculateMonthsCover(countryId, skuId) {
    // NOTE: In production, call Azure Function for calculation here
    // For now, returning mock data for development
    return { monthsCover: 3.5, closingStock: 4500, avgConsumption: 1285 };
  }
}

// Export singleton instance
export default new DataverseService();

