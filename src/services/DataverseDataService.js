/**
 * Dataverse Data Service
 * Main service for all Dataverse operations
 * Uses schema from dataverse-schema.js based on DATAVERSE_SCHEMA_MAPPING.md
 */

import { 
  DataverseSchema, 
  DATAVERSE_BASE_URL,
  getTableSchema, 
  getTableName, 
  getPrimaryKey, 
  getColumnName, 
  getLookupBinding, 
  getFilterField 
} from '@/config/dataverse-schema.js';
import { msalInstance, getDataverseScopes } from '@/config/index.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('DataverseDataService');

class DataverseDataService {
  constructor() {
    this.baseUrl = DATAVERSE_BASE_URL;
    this.token = null;
    this.tokenExpiry = null;
    // Cache for entity logical name mapping (EntitySetName -> LogicalName)
    this.entityLogicalNameCache = null;
    this.entityLogicalNameCacheTime = null;
    this.entityLogicalNameCacheTimeout = 1000 * 60 * 60; // Cache for 1 hour
  }

  /**
   * Get access token from Azure AD using MSAL
   */
  async getAccessToken() {
    // Check if token is still valid (with 1 minute buffer)
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.token;
    }

    logger.debug('Acquiring new access token...');
    
    try {
      // Get the active account
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error('No authenticated account found. Please sign in first.');
      }
      
      const account = accounts[0];
      const scopes = getDataverseScopes();
      
      // Try to acquire token silently first (uses cache)
      try {
        const response = await msalInstance.acquireTokenSilent({
          scopes: scopes,
          account: account
        });
        
        this.token = response.accessToken;
        // MSAL returns expiresOn as a Date object
        this.tokenExpiry = response.expiresOn ? response.expiresOn.getTime() : Date.now() + 3600000;
        
        logger.debug('Token acquired silently');
        return this.token;
      } catch (silentError) {
        // If silent acquisition fails, try interactive (popup)
        logger.debug('Silent token acquisition failed, trying interactive...', silentError);
        
        // For service calls, we can't use popup/redirect easily
        // Instead, throw an error to let the UI handle re-authentication
        if (silentError.errorCode === 'interaction_required' || 
            silentError.errorCode === 'consent_required' ||
            silentError.errorCode === 'login_required') {
          throw new Error('Authentication required. Please sign in again.');
        }
        
        throw silentError;
      }
    } catch (error) {
      logger.error('Failed to acquire access token', error);
      throw new Error(`Authentication failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Generic fetch method with authentication
   * Handles OData v4.0 queries
   */
  async fetch(endpoint, options = {}) {
    const token = await this.getAccessToken();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Prefer': 'return=representation',
        ...(options.body && { 'Content-Type': 'application/json' }),
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Dataverse API error: ${response.status} ${response.statusText} - ${errorText}`);
      error.status = response.status;
      error.errorText = errorText;
      error.endpoint = endpoint;
      
      // Try to parse error as JSON for better error details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson;
        error.error = errorJson;
        // Extract OData error message if available
        if (errorJson.error && errorJson.error.message) {
          error.message = errorJson.error.message;
          error.odataError = errorJson.error;
        }
      } catch (e) {
        // Not JSON, use as-is
      }
      
      // Log 404s as warnings (expected for entity discovery/verification)
      // Log other errors as errors with full details
      if (response.status === 404) {
        logger.warn(`Dataverse API 404: ${endpoint}`, { endpoint, errorText });
      } else {
        logger.error(`Dataverse API error: ${response.status}`, { 
          endpoint, 
          errorText, 
          errorDetails,
          parsedError: error.odataError || errorDetails
        });
      }
      throw error;
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  }

  /**
   * Build OData filter string from filter object
   * Maps friendly names to Dataverse column names
   */
  buildFilter(schemaKey, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return '';
    }

    const schema = getTableSchema(schemaKey);
    const filterParts = [];
    
    
    // Map friendly filter names to lookup field names
    const friendlyToLookupMap = {
      countryId: 'country',
      skuId: 'sku',
      orderId: 'order',
      shippingId: 'shipping',
      labelId: 'label',
      destinationId: 'destination',
      distributorId: 'distributor',
      warehouseId: 'warehouse'
    };
    
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }
      
      // Map friendly name to lookup field name if needed
      const lookupFieldName = friendlyToLookupMap[key] || key;
      
      // Check if it's a lookup field (use filter field)
      const filterField = schema.filterFields[lookupFieldName];
      let columnName;
      
      if (filterField) {
        // Use the filter field (e.g., _new_country_value)
        columnName = filterField;
      } else {
        // Try to get column name from schema
        columnName = getColumnName(schemaKey, key);
      }
      
      
      if (Array.isArray(value)) {
        // Handle IN clause: field eq 'value1' or field eq 'value2'
        const orParts = value.map(v => `${columnName} eq ${this.formatFilterValue(v)}`).join(' or ');
        filterParts.push(`(${orParts})`);
      } else {
        filterParts.push(`${columnName} eq ${this.formatFilterValue(value)}`);
      }
    }
    
    const filterString = filterParts.length > 0 ? `$filter=${filterParts.join(' and ')}` : '';
    
    return filterString;
  }

  /**
   * Format filter value for OData
   */
  formatFilterValue(value) {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  /**
   * Build OData query string
   */
  buildQuery(schemaKey, { select, filter, expand, orderby, top, skip } = {}) {
    const schema = getTableSchema(schemaKey);
    const parts = [];
    
    if (select && select.length > 0) {
      // Map friendly names to Dataverse column names
      const mappedSelect = select.map(col => getColumnName(schemaKey, col));
      parts.push(`$select=${mappedSelect.join(',')}`);
    } else if (schema.defaultSelect) {
      parts.push(`$select=${schema.defaultSelect.join(',')}`);
    }
    
    if (filter) {
      const filterStr = typeof filter === 'string' ? filter : this.buildFilter(schemaKey, filter);
      if (filterStr) parts.push(filterStr);
    }
    
    if (expand && expand.length > 0) {
      // Map friendly lookup names to Dataverse lookup names with field selection
      const mappedExpand = expand.map(lookup => {
        const lookupBinding = schema.lookups[lookup];
        if (lookupBinding) {
          // Extract the lookup field name from binding (e.g., "new_Country@odata.bind" -> "new_Country")
          const lookupField = lookupBinding.split('@')[0];
          
          // Determine target schema and select key fields
          const targetSchemaMap = {
            'country': 'countries',
            'sku': 'skus',
            'order': 'orders',
            'shipping': 'shipments',
            'label': 'labels',
            'destination': 'countries',
            'distributor': 'distributors',
            'warehouse': 'warehouses',
            'actualInventory': 'actualInventory'
          };
          
          const targetSchemaKey = targetSchemaMap[lookup] || lookup;
          
          // Try to get schema, but handle gracefully if it doesn't exist
          let targetSchema;
          try {
            targetSchema = getTableSchema(targetSchemaKey);
          } catch (error) {
            // If schema doesn't exist, just select primary key (will be inferred by Dataverse)
            logger.warn(`Schema not found for ${targetSchemaKey}, using minimal expand`, { lookup, targetSchemaKey });
            return `${lookupField}($select=${lookupField}id)`;
          }
          
          // Select primary key and ALL name fields for expanded entity
          const expandSelect = [targetSchema.primaryKey];
          
          // Always include name field if it exists
          if (targetSchema.columns.name) {
            expandSelect.push(getColumnName(targetSchemaKey, 'name'));
          }
          
          // For orders, also include poId (alternative identifier)
          if (targetSchemaKey === 'orders' && targetSchema.columns.poId) {
            expandSelect.push(getColumnName(targetSchemaKey, 'poId'));
          }
          
          // For countries, include countryName if different from name
          if (targetSchemaKey === 'countries' && targetSchema.columns.countryName) {
            expandSelect.push(getColumnName(targetSchemaKey, 'countryName'));
          }
          
          // For SKUs, include skuName if different from name
          if (targetSchemaKey === 'skus' && targetSchema.columns.skuName) {
            expandSelect.push(getColumnName(targetSchemaKey, 'skuName'));
          }
          
          // For shipments, include shipmentNumber
          if (targetSchemaKey === 'shipments' && targetSchema.columns.shipmentNumber) {
            expandSelect.push(getColumnName(targetSchemaKey, 'shipmentNumber'));
          }
          
          // For distributors, include name (which is new_distributorname)
          if (targetSchemaKey === 'distributors' && targetSchema.columns.name) {
            expandSelect.push(getColumnName(targetSchemaKey, 'name'));
          }
          // Also include distributorId if available
          if (targetSchemaKey === 'distributors' && targetSchema.columns.distributorId) {
            expandSelect.push(getColumnName(targetSchemaKey, 'distributorId'));
          }
          
          return `${lookupField}($select=${expandSelect.join(',')})`;
        }
        return null; // Return null for invalid lookups
      }).filter(Boolean); // Remove any null/undefined entries
      if (mappedExpand.length > 0) {
        parts.push(`$expand=${mappedExpand.join(',')}`);
      }
    }
    
    if (orderby) {
      const orderStr = Array.isArray(orderby) 
        ? orderby.map(o => {
            const field = typeof o === 'string' ? o : o.field;
            const order = typeof o === 'string' ? 'asc' : (o.order || 'asc');
            const columnName = getColumnName(schemaKey, field);
            return `${columnName} ${order}`;
          }).join(',')
        : orderby;
      parts.push(`$orderby=${orderStr}`);
    }
    
    if (top) {
      parts.push(`$top=${top}`);
    }
    
    if (skip) {
      parts.push(`$skip=${skip}`);
    }
    
    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }

  /**
   * Transform Dataverse response to friendly names
   */
  transformResponse(schemaKey, data) {
    const schema = getTableSchema(schemaKey);
    
    // Create reverse mapping (dataverse name -> friendly name)
    const reverseMap = {};
    for (const [friendly, dataverse] of Object.entries(schema.columns)) {
      reverseMap[dataverse] = friendly;
    }
    
    // Transform single record
    const transformRecord = (record) => {
      let result = {};
      for (const [key, value] of Object.entries(record)) {
        const friendlyName = reverseMap[key] || key;
        result[friendlyName] = value;
      }
      
      // Calculate derived fields for order items
      if (schemaKey === 'orderItems') {
        result = this.calculateOrderItemFields(result);
        
        // Convert orderPlacementStatus to string status for UI filtering
        if (result.orderPlacementStatus !== undefined) {
          const statusName = this.getStatusName('orderItems', 'orderPlacementStatus', result.orderPlacementStatus);
          // Map status names to UI expectations
          const statusMap = {
            'System Forecasted Order': 'System Forecasted',
            'Planned By LO': 'Planned',
            'Confirmed Pending RO Approval': 'Pending RO Approval',
            'RO Approved Pending CFO Approval': 'Pending CFO Approval',
            'Approved': 'Approved',
            'Confirmed to UP': 'Confirmed to UP',
            'Back Order': 'Back Order',
            'Allocation Pending RO Approval': 'Allocation Pending',
            'Allocated To Market': 'Allocated',
            'Shipped To Market': 'Shipped',
            'Remaining For Shipping': 'Remaining For Shipping',
            'Completed': 'Completed',
            'Item Approved Pending PO Approval': 'Pending PO Approval'
          };
          result.status = statusMap[statusName] || statusName; // Add status field with string name for UI compatibility
        }
      }
      
      // Convert status codes to string names for orders
      if (schemaKey === 'orders') {
        if (result.orderStatus !== undefined) {
          const statusName = this.getStatusName('orders', 'orderStatus', result.orderStatus);
          // Map status names to UI expectations
          const statusMap = {
            'Open': 'Draft',
            'Approved': 'CFO Approved',
            'Pending CFO Approval': 'Pending CFO Approval',
            'Completed': 'Completed',
            'Confirmed to UP': 'Confirmed to UP'
          };
          result.status = statusMap[statusName] || statusName; // Add status field with string name for UI compatibility
        }
      }
      
      return result;
    };
    
    // Handle array or single record
    let transformed;
    if (Array.isArray(data)) {
      transformed = data.map(transformRecord);
    } else if (data.value && Array.isArray(data.value)) {
      transformed = { ...data, value: data.value.map(transformRecord) };
    } else {
      transformed = transformRecord(data);
    }
    
    return transformed;
  }

  /**
   * Calculate derived fields for order items
   * - qtyInCartons from orderItemQty and tinsPerCarton (if SKU is expanded)
   * - Extract names from expanded lookups (country, sku, order)
   */
  calculateOrderItemFields(orderItem) {
    // If SKU is expanded and has tinsPerCarton, calculate qtyInCartons if missing
    if (orderItem.sku && orderItem.sku.tinsPerCarton && orderItem.orderItemQty && !orderItem.qtyInCartons) {
      orderItem.qtyInCartons = orderItem.orderItemQty / orderItem.sku.tinsPerCarton;
    }
    
    // Extract names from expanded lookups - ALWAYS use names, never IDs for display
    if (orderItem.country) {
      // Priority: countryName > name > id (but never show GUID)
      orderItem.countryName = orderItem.country.countryName || orderItem.country.name || orderItem.country.id;
      orderItem.countryId = orderItem.country.id || orderItem.countryId;
      
      // Ensure countryName is never a GUID
      if (orderItem.countryName && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderItem.countryName)) {
        orderItem.countryName = orderItem.country.name || orderItem.country.countryName || orderItem.countryName;
      }
    }
    if (orderItem.sku) {
      // Priority: skuName > name > id (but never show GUID)
      orderItem.skuName = orderItem.sku.skuName || orderItem.sku.name || orderItem.sku.id;
      orderItem.skuId = orderItem.sku.id || orderItem.skuId;
      
      // Ensure skuName is never a GUID
      if (orderItem.skuName && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderItem.skuName)) {
        orderItem.skuName = orderItem.sku.name || orderItem.sku.skuName || orderItem.skuName;
      }
    }
    if (orderItem.order) {
      // Map Order (PO) fields - ALWAYS use name, never ID
      // Priority: name > poId > id (but prefer name)
      orderItem.poName = orderItem.order.name || orderItem.order.poId || orderItem.order.id;
      orderItem.poId = orderItem.order.id || orderItem.poId;
      // Also set orderId for consistency (internal use only)
      orderItem.orderId = orderItem.order.id || orderItem.orderId;
      
      // Ensure poName is never a GUID - if it looks like a GUID, use poId or name field
      if (orderItem.poName && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderItem.poName)) {
        // It's a GUID, try to get the actual name
        orderItem.poName = orderItem.order.poId || orderItem.order.name || orderItem.poName;
      }
    }
    if (orderItem.shipping) {
      // Priority: shipmentNumber > name > id (but never show GUID)
      orderItem.shipmentName = orderItem.shipping.shipmentNumber || orderItem.shipping.name || orderItem.shipping.id;
      orderItem.shippingId = orderItem.shipping.id || orderItem.shippingId;
      
      // Ensure shipmentName is never a GUID
      if (orderItem.shipmentName && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderItem.shipmentName)) {
        orderItem.shipmentName = orderItem.shipping.shipmentNumber || orderItem.shipping.name || orderItem.shipmentName;
      }
    }
    if (orderItem.label) {
      // Always use name, never ID
      orderItem.labelName = orderItem.label.name || orderItem.label.id;
      orderItem.labelId = orderItem.label.id || orderItem.labelId;
      
      // Ensure labelName is never a GUID
      if (orderItem.labelName && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderItem.labelName)) {
        orderItem.labelName = orderItem.label.name || orderItem.labelName;
      }
    }
    
    // Ensure qtyInCartons is a number
    if (orderItem.qtyInCartons && typeof orderItem.qtyInCartons === 'string') {
      orderItem.qtyInCartons = parseFloat(orderItem.qtyInCartons);
    }
    if (orderItem.orderItemQty && typeof orderItem.orderItemQty === 'string') {
      orderItem.orderItemQty = parseFloat(orderItem.orderItemQty);
    }
    
    // Add qtyCartons as an alias for qtyInCartons for backward compatibility
    if (orderItem.qtyInCartons !== undefined && orderItem.qtyCartons === undefined) {
      orderItem.qtyCartons = orderItem.qtyInCartons;
    }
    
    return orderItem;
  }

  /**
   * Calculate qtyInCartons from orderItemQty and tinsPerCarton
   * @param {number} orderItemQty - Quantity in tins
   * @param {number} tinsPerCarton - Number of tins per carton (from SKU)
   * @returns {number} - Quantity in cartons
   */
  calculateQtyInCartons(orderItemQty, tinsPerCarton) {
    if (!tinsPerCarton || tinsPerCarton === 0) {
      logger.warn('tinsPerCarton is 0 or missing, using 1 as default');
      return orderItemQty;
    }
    return orderItemQty / tinsPerCarton;
  }

  /**
   * Get SKU metadata (including tinsPerCarton) for calculations
   */
  async getSkuForCalculation(skuId) {
    const sku = await this.getSkuById(skuId);
    if (!sku) {
      throw new Error(`SKU ${skuId} not found`);
    }
    return {
      id: sku.id,
      tinsPerCarton: sku.tinsPerCarton || 1,
      name: sku.name
    };
  }

  // ===========================================================================
  // COUNTRIES
  // ===========================================================================

  async getCountries(filters = {}) {
    const query = this.buildQuery('countries', { filter: filters });
    const result = await this.fetch(`/${getTableName('countries')}${query}`);
    const transformed = this.transformResponse('countries', result);
    return transformed.value || transformed;
  }

  async getCountryById(countryId) {
    const query = this.buildQuery('countries');
    const result = await this.fetch(`/${getTableName('countries')}(${countryId})${query}`);
    return this.transformResponse('countries', result);
  }

  // ===========================================================================
  // SKUs
  // ===========================================================================

  async getSkus(filters = {}) {
    const query = this.buildQuery('skus', { filter: filters });
    const result = await this.fetch(`/${getTableName('skus')}${query}`);
    const transformed = this.transformResponse('skus', result);
    return transformed.value || transformed;
  }

  async getAllowedOrderMonths(filters = {}) {
    const query = this.buildQuery('allowedOrderMonths', { filter: filters });
    const result = await this.fetch(`/${getTableName('allowedOrderMonths')}${query}`);
    const transformed = this.transformResponse('allowedOrderMonths', result);
    return transformed.value || transformed;
  }

  async getSkuById(skuId) {
    const query = this.buildQuery('skus');
    const result = await this.fetch(`/${getTableName('skus')}(${skuId})${query}`);
    return this.transformResponse('skus', result);
  }

  async getSkuMetadata(skuId) {
    const query = this.buildQuery('skus', { 
      select: ['tinsPerCarton'] 
    });
    const result = await this.fetch(`/${getTableName('skus')}(${skuId})${query}`);
    return this.transformResponse('skus', result);
  }

  // ===========================================================================
  // ORDERS (Purchase Orders)
  // ===========================================================================

  async getPOs(filters = {}) {
    try {
      // Always expand destination lookup to get country name
      const query = this.buildQuery('orders', { 
        filter: filters,
        expand: ['destination'], // Expand destination to get country name
        orderby: [{ field: 'date', order: 'desc' }] // Use date field instead of createdOn
      });
      const result = await this.fetch(`/${getTableName('orders')}${query}`);
      const transformed = this.transformResponse('orders', result);
      const pos = transformed.value || transformed;
      
      // Ensure PO names are populated (never show GUIDs)
      if (Array.isArray(pos)) {
        pos.forEach(po => {
          // If name is a GUID, use poId or ensure we have a proper name
          if (po.name && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(po.name)) {
            po.name = po.poId || po.name;
          }
          // Extract destination country name if expanded
          if (po.destination) {
            po.destinationName = po.destination.name || po.destination.countryName;
            po.destinationId = po.destination.id || po.destinationId;
          }
        });
      }
      
      return pos;
    } catch (error) {
      // If table doesn't exist (404), return empty array instead of throwing
      if (error.status === 404 || (error.message && error.message.includes('not found'))) {
        logger.warn('Orders table not found - returning empty array. Table may not exist in Dataverse.', {
          tableName: getTableName('orders'),
          error: error.message
        });
        return [];
      }
      throw error;
    }
  }

  async getPOById(poId) {
    try {
      // Always expand destination to get country name
      const query = this.buildQuery('orders', {
        expand: ['destination'] // Get destination country name
      });
      const result = await this.fetch(`/${getTableName('orders')}(${poId})${query}`);
      const transformed = this.transformResponse('orders', result);
      
      if (transformed) {
        // Ensure name is never a GUID
        if (transformed.name && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transformed.name)) {
          transformed.name = transformed.poId || transformed.name;
        }
        
        // Extract destination country name if expanded
        if (transformed.destination) {
          transformed.destinationName = transformed.destination.name || transformed.destination.countryName;
          transformed.destinationId = transformed.destination.id || transformed.destinationId;
        }
      }
      
      return transformed;
    } catch (error) {
      // If table doesn't exist (404), return null instead of throwing
      if (error.status === 404 || (error.message && error.message.includes('not found'))) {
        logger.warn('Orders table not found - returning null. Table may not exist in Dataverse.', {
          tableName: getTableName('orders'),
          poId,
          error: error.message
        });
        return null;
      }
      throw error;
    }
  }

  async createPO(poData) {
    const schema = getTableSchema('orders');
    const payload = {};
    
    // Map friendly names to Dataverse column names
    for (const [key, value] of Object.entries(poData)) {
      if (key === 'destinationId' && value) {
        // Handle lookup binding
        Object.assign(payload, getLookupBinding('orders', 'destination', value));
      } else if (schema.columns[key]) {
        payload[getColumnName('orders', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('orders')}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('orders', result);
  }

  async updatePO(poId, updates) {
    const schema = getTableSchema('orders');
    const payload = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'destinationId' && value) {
        Object.assign(payload, getLookupBinding('orders', 'destination', value));
      } else if (schema.columns[key]) {
        payload[getColumnName('orders', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('orders')}(${poId})`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('orders', result);
  }

  async deletePO(poId) {
    return this.fetch(`/${getTableName('orders')}(${poId})`, {
      method: 'DELETE'
    });
  }

  // ===========================================================================
  // ORDER ITEMS
  // ===========================================================================

  async getOrderItems(filters = {}) {
    // Always expand core lookups to get names (country, sku, order)
    // Shipping and label are optional and may not always be linked, so we don't expand them here
    // This ensures we have names instead of just IDs
    const query = this.buildQuery('orderItems', { 
      filter: filters,
      expand: ['country', 'sku', 'order'], // Core lookups - always needed
      orderby: [{ field: 'date', order: 'desc' }]
    });
    const result = await this.fetch(`/${getTableName('orderItems')}${query}`);
    const transformed = this.transformResponse('orderItems', result);
    // Return array directly if it's wrapped in a value property
    return transformed.value || transformed;
  }

  async getOrderItemById(orderItemId) {
    // For single item, we can expand all lookups including optional ones
    const query = this.buildQuery('orderItems', {
      expand: ['country', 'sku', 'order', 'shipping', 'label'] // All lookups for detailed view
    });
    const result = await this.fetch(`/${getTableName('orderItems')}(${orderItemId})${query}`);
    return this.transformResponse('orderItems', result);
  }

  async createOrderItem(orderItemData) {
    const schema = getTableSchema('orderItems');
    const payload = {};
    
    // Calculate qtyInCartons if not provided but orderItemQty and skuId are
    if (orderItemData.orderItemQty && orderItemData.skuId && !orderItemData.qtyInCartons) {
      try {
        const sku = await this.getSkuForCalculation(orderItemData.skuId);
        orderItemData.qtyInCartons = this.calculateQtyInCartons(orderItemData.orderItemQty, sku.tinsPerCarton);
      } catch (error) {
        logger.warn('Could not calculate qtyInCartons, using orderItemQty as fallback', error);
        orderItemData.qtyInCartons = orderItemData.orderItemQty;
      }
    }
    
    for (const [key, value] of Object.entries(orderItemData)) {
      // Handle lookup bindings
      if (key === 'countryId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'country', value));
      } else if (key === 'skuId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'sku', value));
      } else if (key === 'orderId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'order', value));
      } else if (key === 'shippingId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'shipping', value));
      } else if (key === 'labelId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'label', value));
      } else if (schema.columns[key] && value !== undefined) {
        payload[getColumnName('orderItems', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('orderItems')}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('orderItems', result);
  }

  async updateOrderItem(orderItemId, updates) {
    const schema = getTableSchema('orderItems');
    const payload = {};
    
    // If orderItemQty is updated, recalculate qtyInCartons if needed
    if (updates.orderItemQty !== undefined && updates.qtyInCartons === undefined) {
      // Get current order item to find SKU
      try {
        const currentItem = await this.getOrderItemById(orderItemId);
        if (currentItem && currentItem.skuId) {
          const sku = await this.getSkuForCalculation(currentItem.skuId);
          updates.qtyInCartons = this.calculateQtyInCartons(updates.orderItemQty, sku.tinsPerCarton);
        }
      } catch (error) {
        logger.warn('Could not recalculate qtyInCartons during update', error);
      }
    }
    
    for (const [key, value] of Object.entries(updates)) {
      // Handle lookup bindings
      if (key === 'countryId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'country', value));
      } else if (key === 'skuId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'sku', value));
      } else if (key === 'orderId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'order', value));
      } else if (key === 'shippingId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'shipping', value));
      } else if (key === 'labelId' && value) {
        Object.assign(payload, getLookupBinding('orderItems', 'label', value));
      } else if (schema.columns[key] && value !== undefined) {
        payload[getColumnName('orderItems', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('orderItems')}(${orderItemId})`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('orderItems', result);
  }

  async deleteOrderItem(orderItemId) {
    return this.fetch(`/${getTableName('orderItems')}(${orderItemId})`, {
      method: 'DELETE'
    });
  }

  // ===========================================================================
  // FORECASTS
  // ===========================================================================

  async getForecasts(filters = {}) {
    const query = this.buildQuery('forecasts', { 
      filter: filters,
      expand: ['country', 'sku']
    });
    const result = await this.fetch(`/${getTableName('forecasts')}${query}`);
    const transformed = this.transformResponse('forecasts', result);
    return transformed.value || transformed;
  }

  async getForecastById(forecastId) {
    const query = this.buildQuery('forecasts', {
      expand: ['country', 'sku']
    });
    const result = await this.fetch(`/${getTableName('forecasts')}(${forecastId})${query}`);
    return this.transformResponse('forecasts', result);
  }

  async createForecast(forecastData) {
    const schema = getTableSchema('forecasts');
    const payload = {};
    
    for (const [key, value] of Object.entries(forecastData)) {
      if (key === 'countryId' && value) {
        Object.assign(payload, getLookupBinding('forecasts', 'country', value));
      } else if (key === 'skuId' && value) {
        Object.assign(payload, getLookupBinding('forecasts', 'sku', value));
      } else if (schema.columns[key]) {
        payload[getColumnName('forecasts', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('forecasts')}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('forecasts', result);
  }

  async updateForecast(forecastId, updates) {
    const schema = getTableSchema('forecasts');
    const payload = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'countryId' && value) {
        Object.assign(payload, getLookupBinding('forecasts', 'country', value));
      } else if (key === 'skuId' && value) {
        Object.assign(payload, getLookupBinding('forecasts', 'sku', value));
      } else if (schema.columns[key] && value !== undefined) {
        payload[getColumnName('forecasts', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('forecasts')}(${forecastId})`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('forecasts', result);
  }

  async deleteForecast(forecastId) {
    return this.fetch(`/${getTableName('forecasts')}(${forecastId})`, {
      method: 'DELETE'
    });
  }

  // ===========================================================================
  // BUDGETS
  // ===========================================================================

  async getBudgets(filters = {}) {
    const query = this.buildQuery('budgets', { filter: filters });
    const result = await this.fetch(`/${getTableName('budgets')}${query}`);
    const transformed = this.transformResponse('budgets', result);
    return transformed.value || transformed;
  }

  // ===========================================================================
  // SHIPMENTS
  // ===========================================================================

  async getShipments(filters = {}) {
    const query = this.buildQuery('shipments', { 
      filter: filters,
      expand: ['country', 'destination'],
      orderby: [{ field: 'deliveryDate', order: 'desc' }]
    });
    const result = await this.fetch(`/${getTableName('shipments')}${query}`);
    const transformed = this.transformResponse('shipments', result);
    return transformed.value || transformed;
  }

  async getShipmentById(shipmentId) {
    const query = this.buildQuery('shipments', {
      expand: ['country', 'destination']
    });
    const result = await this.fetch(`/${getTableName('shipments')}(${shipmentId})${query}`);
    return this.transformResponse('shipments', result);
  }

  async createShipment(shipmentData) {
    const schema = getTableSchema('shipments');
    const payload = {};
    
    for (const [key, value] of Object.entries(shipmentData)) {
      if (key === 'countryId' && value) {
        Object.assign(payload, getLookupBinding('shipments', 'country', value));
      } else if (key === 'destinationId' && value) {
        Object.assign(payload, getLookupBinding('shipments', 'destination', value));
      } else if (schema.columns[key]) {
        payload[getColumnName('shipments', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('shipments')}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('shipments', result);
  }

  async updateShipment(shipmentId, updates) {
    const schema = getTableSchema('shipments');
    const payload = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'countryId' && value) {
        Object.assign(payload, getLookupBinding('shipments', 'country', value));
      } else if (key === 'destinationId' && value) {
        Object.assign(payload, getLookupBinding('shipments', 'destination', value));
      } else if (schema.columns[key] && value !== undefined) {
        payload[getColumnName('shipments', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('shipments')}(${shipmentId})`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('shipments', result);
  }

  async deleteShipment(shipmentId) {
    return this.fetch(`/${getTableName('shipments')}(${shipmentId})`, {
      method: 'DELETE'
    });
  }


  // ===========================================================================
  // STOCK AGING REPORTS
  // ===========================================================================

  async getStockAgingData(filters = {}) {
    const query = this.buildQuery('stockAgingReports', { filter: filters });
    const result = await this.fetch(`/${getTableName('stockAgingReports')}${query}`);
    return this.transformResponse('stockAgingReports', result);
  }

  // ===========================================================================
  // FORECAST LOGS
  // ===========================================================================

  async getForecastLogs(filters = {}) {
    const query = this.buildQuery('forecastLogs', { filter: filters });
    const result = await this.fetch(`/${getTableName('forecastLogs')}${query}`);
    const transformed = this.transformResponse('forecastLogs', result);
    return transformed.value || transformed;
  }

  async createForecastLog(logData) {
    const schema = getTableSchema('forecastLogs');
    const payload = {};
    
    for (const [key, value] of Object.entries(logData)) {
      if (key === 'countryId' && value) {
        Object.assign(payload, getLookupBinding('forecastLogs', 'country', value));
      } else if (key === 'skuId' && value) {
        Object.assign(payload, getLookupBinding('forecastLogs', 'sku', value));
      } else if (schema.columns[key]) {
        payload[getColumnName('forecastLogs', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('forecastLogs')}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('forecastLogs', result);
  }

  // ===========================================================================
  // TARGET COVER STOCK
  // ===========================================================================

  async getTargetCoverStock(filters = {}) {
    const query = this.buildQuery('targetCoverStock', { filter: filters });
    const result = await this.fetch(`/${getTableName('targetCoverStock')}${query}`);
    return this.transformResponse('targetCoverStock', result);
  }

  // ===========================================================================
  // PROCUREMENT SAFE MARGIN
  // ===========================================================================

  async getProcurementSafeMargin(filters = {}) {
    const query = this.buildQuery('procurementSafeMargin', { filter: filters });
    const result = await this.fetch(`/${getTableName('procurementSafeMargin')}${query}`);
    return this.transformResponse('procurementSafeMargin', result);
  }

  // ===========================================================================
  // CALCULATION MAPPINGS
  // ===========================================================================

  async getCalculationMappings(filters = {}) {
    // Remove isActive filter if it exists (column doesn't exist)
    const cleanFilters = { ...filters };
    if ('isActive' in cleanFilters) {
      delete cleanFilters.isActive;
    }
    
    // Build query - only select fields that exist (backward compatible)
    // The new fields (aggregationType, filterLogic, etc.) may not exist in Dataverse yet
    const baseSelect = [
      'new_calculationmappingid',
      'new_name',
      'new_measurekey',
      'new_sourcetable',
      'new_fieldname',
      'new_doctypepatterns',
      'new_channelpatterns',
      'new_sign',
      'new_quantityfield',
      'new_mappingtype',
      'new_configuration',
      'new_sortorder'
    ];
    
    // Try to include new fields, but fallback gracefully if they don't exist
    const newFields = [
      'new_aggregationtype',
      'new_filterlogic',
      'new_groupbycolumns',
      'new_calculationexpression'
    ];
    
    // Build query using defaultSelect from schema (which uses friendly names)
    // This will automatically map to Dataverse column names
    // Note: New fields (aggregationType, filterLogic, etc.) are not in defaultSelect
    // until they are added to the Dataverse table
    const query = this.buildQuery('calculationMappings', { 
      filter: cleanFilters
      // Don't specify select - let buildQuery use defaultSelect from schema
    });
    
    const result = await this.fetch(`/${getTableName('calculationMappings')}${query}`);
    const transformed = this.transformResponse('calculationMappings', result);
    return transformed.value || transformed;
  }

  async getCalculationMappingById(mappingId) {
    const query = this.buildQuery('calculationMappings', {
      // Don't expand country/sku since they don't exist
    });
    const result = await this.fetch(`/${getTableName('calculationMappings')}(${mappingId})${query}`);
    return this.transformResponse('calculationMappings', result);
  }

  /**
   * Convert option set string value to numeric value
   * @param {string} fieldName - Field name (e.g., 'aggregationType', 'sign', 'mappingType')
   * @param {string|number} value - String value (e.g., 'sum', 'SUM') or numeric value
   * @param {Object} schema - Schema object with statusCodes
   * @returns {number|undefined} - Numeric option set value or undefined if not found
   */
  _convertOptionSetValue(fieldName, value, schema) {
    // If already a number, return as-is (assuming it's a valid option set value)
    if (typeof value === 'number') {
      return value;
    }
    
    // If not a string, can't convert
    if (typeof value !== 'string') {
      return undefined;
    }
    
    // Get statusCodes for this field
    const statusCodes = schema.statusCodes?.[fieldName];
    if (!statusCodes) {
      return undefined;
    }
    
    // Normalize the string value (uppercase, trim)
    const normalizedValue = value.trim().toUpperCase();
    
    // Find matching label in statusCodes (reverse lookup: label -> value)
    for (const [numericValue, label] of Object.entries(statusCodes)) {
      if (label.toUpperCase() === normalizedValue) {
        return parseInt(numericValue, 10);
      }
    }
    
    // If no match found, return undefined
    return undefined;
  }

  async createCalculationMapping(data) {
    const schema = getTableSchema('calculationMappings');
    const payload = {};
    
    // Map friendly names to Dataverse column names (similar to createOrderItem, createForecast)
    for (const [key, value] of Object.entries(data)) {
      // Skip isActive, country, sku if they don't exist in table
      if (key === 'isActive' || key === 'country' || key === 'sku' || key === 'countryId' || key === 'skuId') {
        continue; // Skip these fields
      }
      
      // Only include fields that exist in schema and have valid values
      if (schema.columns[key]) {
        // Skip null, undefined, and empty strings (Dataverse might not accept empty strings)
        if (value === undefined || value === null) {
          continue;
        }
        
        // For string fields, skip empty strings unless it's a required field
        if (typeof value === 'string' && value.trim() === '' && key !== 'name') {
          continue; // Skip empty strings except for name (which might be required)
        }
        
        const dataverseColumnName = getColumnName('calculationMappings', key);
        let finalValue = value;
        
        // Handle option set fields: convert string values to numeric option set values
        if (key === 'aggregationType' || key === 'sign' || key === 'mappingType') {
          const convertedValue = this._convertOptionSetValue(key, value, schema);
          if (convertedValue !== undefined) {
            finalValue = convertedValue;
          } else if (typeof value === 'string') {
            // If conversion failed and it's still a string, skip this field to avoid errors
            logger.warn(`Could not convert ${key} value "${value}" to option set value, skipping field`);
            continue;
          }
        }
        
        // sortOrder is a string field, others are sent as-is
        if (key === 'sortOrder' && typeof finalValue === 'number') {
          payload[dataverseColumnName] = String(finalValue);
        } else {
          payload[dataverseColumnName] = finalValue;
        }
      }
    }
    
    // Log the payload for debugging
    logger.info('Creating calculation mapping', { 
      payloadKeys: Object.keys(payload),
      payload: payload
    });
    
    const result = await this.fetch(`/${getTableName('calculationMappings')}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    });
    return this.transformResponse('calculationMappings', result);
  }

  async updateCalculationMapping(mappingId, data) {
    const schema = getTableSchema('calculationMappings');
    const payload = {};
    
    // Map friendly names to Dataverse column names
    for (const [key, value] of Object.entries(data)) {
      // Skip isActive, country, sku if they don't exist in table
      if (key === 'isActive' || key === 'country' || key === 'sku' || key === 'countryId' || key === 'skuId') {
        continue; // Skip these fields
      }
      
      // Only include fields that exist in schema and have valid values
      if (schema.columns[key]) {
        // Skip null, undefined, and empty strings (Dataverse might not accept empty strings)
        if (value === undefined || value === null) {
          continue;
        }
        
        // For string fields, skip empty strings unless it's a required field
        if (typeof value === 'string' && value.trim() === '' && key !== 'name') {
          continue; // Skip empty strings except for name (which might be required)
        }
        
        const dataverseColumnName = getColumnName('calculationMappings', key);
        let finalValue = value;
        
        // Handle option set fields: convert string values to numeric option set values
        if (key === 'aggregationType' || key === 'sign' || key === 'mappingType') {
          const convertedValue = this._convertOptionSetValue(key, value, schema);
          if (convertedValue !== undefined) {
            finalValue = convertedValue;
          } else if (typeof value === 'string') {
            // If conversion failed and it's still a string, skip this field to avoid errors
            logger.warn(`Could not convert ${key} value "${value}" to option set value, skipping field`);
            continue;
          }
        }
        
        // sortOrder is a string field, others are sent as-is
        if (key === 'sortOrder' && typeof finalValue === 'number') {
          payload[dataverseColumnName] = String(finalValue);
        } else {
          payload[dataverseColumnName] = finalValue;
        }
      }
    }
    
    const result = await this.fetch(`/${getTableName('calculationMappings')}(${mappingId})`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    });
    return this.transformResponse('calculationMappings', result);
  }

  async deleteCalculationMapping(mappingId) {
    await this.fetch(`/${getTableName('calculationMappings')}(${mappingId})`, {
      method: 'DELETE',
    });
    return { success: true };
  }

  // ===========================================================================
  // SKU COUNTRY ASSIGNMENT
  // ===========================================================================

  async getSkuCountryAssignments(filters = {}) {
    
    // Expand SKU and Country lookups to get IDs and names
    const query = this.buildQuery('skuCountryAssignments', { 
      filter: filters,
      expand: ['sku', 'country'] // Expand to get SKU and Country IDs
    });
    const tableName = getTableName('skuCountryAssignments');
    const fullUrl = `/${tableName}${query}`;
    
    logger.info('Fetching SKU country assignments', {
      filters,
      query,
      fullUrl,
      tableName
    });
    
    const result = await this.fetch(fullUrl);
    
    const transformed = this.transformResponse('skuCountryAssignments', result);
    
    const assignments = transformed.value || transformed;
    
    logger.info('SKU country assignments fetched', {
      filters,
      resultType: Array.isArray(assignments) ? 'array' : typeof assignments,
      count: Array.isArray(assignments) ? assignments.length : 'N/A',
      sampleResult: Array.isArray(assignments) && assignments.length > 0 ? assignments[0] : null,
      rawResult: result
    });
    
    return assignments;
  }

  // ===========================================================================
  // ALLOCATIONS (via OrderItems)
  // ===========================================================================

  /**
   * Get Allocations
   * Since there's no separate allocations table, this queries OrderItems
   * with statuses related to allocation
   */
  async getAllocations(filters = {}) {
    // Query OrderItems with allocation-related statuses
    const allocationFilters = {
      ...filters,
      orderPlacementStatus: [100000007, 100000008] // Allocation Pending RO Approval, Allocated To Market
    };
    
    const result = await this.getOrderItems(allocationFilters);
    return Array.isArray(result) ? result : (result.value || []);
  }

  /**
   * Create Allocation
   * Since allocations are handled through OrderItems, this updates the OrderItem
   */
  async createAllocation(data) {
    // Update the order item status to allocated
    const updates = {
      orderPlacementStatus: 100000008, // Allocated To Market
      allocatedQty: data.allocatedQty,
      remainingQty: data.remainingQty,
    };
    
    // Update the order item
    await this.updateOrderItem(data.orderItemId, updates);
    
    // If partial allocation with push, create new order item
    if (data.action === 'Push' && data.pushToMonth) {
      // Get original order item
      const original = await this.getOrderItemById(data.orderItemId);
      
      // Create new order item for remaining quantity
      const newOrderItem = {
        countryId: original.countryId,
        skuId: original.skuId,
        orderId: original.orderId,
        orderItemQty: data.remainingQty,
        qtyInCartons: data.remainingQty / (original.tinsPerCarton || 1),
        month: data.pushToMonth.split('-')[1],
        year: data.pushToMonth.split('-')[0],
        date: data.pushToMonth,
        orderPlacementStatus: 100000001, // Planned By LO
        channel: original.channel || 100000000,
      };
      
      return this.createOrderItem(newOrderItem);
    }
    
    return { success: true, orderItemId: data.orderItemId };
  }

  // ===========================================================================
  // BATCH OPERATIONS
  // ===========================================================================

  async batch(requests, label = 'batch') {
    if (!requests || requests.length === 0) {
      logger.debug(`Skipping empty batch: ${label}`);
      return;
    }

    logger.info(`Executing batch: ${label}`, { count: requests.length });
    
    // For now, execute sequentially
    // In production, implement proper OData batch request
    const results = [];
    for (const request of requests) {
      try {
        const result = await this.fetch(request.path, {
          method: request.method,
          body: request.payload ? JSON.stringify(request.payload) : undefined
        });
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    return results;
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get available table names from Dataverse metadata
   */
  async discoverTableNames() {
    try {
      logger.info('Discovering table names from Dataverse metadata...');
      const metadataUrl = `${this.baseUrl}/$metadata`;
      const response = await fetch(metadataUrl, {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Accept': 'application/xml'
        }
      });
      
      if (response.ok) {
        const xml = await response.text();
        const entityMatches = xml.match(/EntityType Name="([^"]+)"/g) || [];
        const tableNames = entityMatches.map(match => {
          const name = match.match(/Name="([^"]+)"/)[1];
          return name;
        }).filter(name => name.startsWith('new_'));
        
        logger.info('Discovered Dataverse tables', {
          count: tableNames.length,
          tables: tableNames.slice(0, 20)
        });
        
        return tableNames;
      }
    } catch (error) {
      logger.warn('Failed to discover table names from metadata', error);
    }
    return [];
  }

  /**
   * Get status code name by value
   */
  getStatusName(schemaKey, fieldName, statusValue) {
    const schema = getTableSchema(schemaKey);
    const statusCodes = schema.statusCodes[fieldName];
    if (statusCodes && statusCodes[statusValue]) {
      return statusCodes[statusValue];
    }
    return statusValue;
  }

  /**
   * Get entity logical name from EntitySetName (table name)
   * Dynamically discovers the mapping by querying EntityDefinitions
   * Caches the result for performance
   * 
   * @param {string} tableName - EntitySetName (OData table name, e.g., 'new_rawaggregateds')
   * @returns {Promise<string|null>} - Entity logical name (e.g., 'new_rawaggregated') or null if not found
   */
  async getEntityLogicalName(tableName) {
    // Check cache first
    if (this.entityLogicalNameCache && 
        this.entityLogicalNameCacheTime && 
        (Date.now() - this.entityLogicalNameCacheTime) < this.entityLogicalNameCacheTimeout) {
      const cached = this.entityLogicalNameCache[tableName];
      if (cached) {
        return cached;
      }
    }

    try {
      // Fetch all EntityDefinitions to build the mapping
      logger.info('Fetching EntityDefinitions to build EntitySetName -> LogicalName mapping');
      const response = await this.fetch('/EntityDefinitions?$select=LogicalName,EntitySetName');
      const entities = response.value || [];

      // Build mapping: EntitySetName -> LogicalName
      const mapping = {};
      entities.forEach(entity => {
        if (entity.EntitySetName && entity.LogicalName) {
          mapping[entity.EntitySetName] = entity.LogicalName;
        }
      });

      // Cache the mapping
      this.entityLogicalNameCache = mapping;
      this.entityLogicalNameCacheTime = Date.now();

      logger.info('Entity logical name mapping built', {
        totalEntities: entities.length,
        mappedEntities: Object.keys(mapping).length,
        requestedTable: tableName,
        found: mapping[tableName] || 'NOT FOUND',
        sampleMappings: Object.entries(mapping).slice(0, 10)
      });

      const logicalName = mapping[tableName];
      if (!logicalName) {
        logger.warn(`Entity logical name not found for table ${tableName}`, {
          availableTables: Object.keys(mapping).filter(k => k.includes('raw') || k.includes('aggregated')).slice(0, 5)
        });
      }
      return logicalName || null;
    } catch (error) {
      logger.error('Failed to fetch EntityDefinitions for logical name mapping', error);
      // Return null if fetch fails - will fallback to other strategies
      return null;
    }
  }

  /**
   * Get option set values for a field in a table
   * Generic method that works for any table/field combination
   * 
   * @param {string} schemaKey - Schema key (e.g., 'rawAggregated')
   * @param {string} fieldName - Field name (e.g., 'docType', 'channel')
   * @returns {Promise<Object>} - Map of option set value (number) to label (string)
   */
  async getFieldOptionSetValues(schemaKey, fieldName) {
    // First, check the schema - it's the source of truth
    const schema = getTableSchema(schemaKey);
    if (schema.statusCodes?.[fieldName] && Object.keys(schema.statusCodes[fieldName]).length > 0) {
      return schema.statusCodes[fieldName];
    }

    // If not in schema, try to fetch from Dataverse metadata (fallback only)
    try {
      const tableName = getTableName(schemaKey);
      const columnName = getColumnName(schemaKey, fieldName);

      // Get entity logical name dynamically
      const entityLogicalName = await this.getEntityLogicalName(tableName);
      
      if (!entityLogicalName) {
        logger.debug(`Could not find entity logical name for table ${tableName}, field ${fieldName} not in schema`);
        return {};
      }

      // Fetch attribute metadata
      const response = await this.fetch(
        `/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${columnName}')`
      );

      // Check if it's a global option set (by OptionSetName)
      if (response.OptionSetName) {
        const globalOptionSets = await this.fetch('/GlobalOptionSetDefinitions');
        const globalOptionSet = globalOptionSets.value?.find(
          os => os.Name === response.OptionSetName
        );

        if (globalOptionSet && globalOptionSet.Options) {
          const values = {};
          globalOptionSet.Options.forEach(option => {
            if (option.Value != null) {
              values[option.Value] = option.Label?.UserLocalizedLabel?.Label || option.Label || `Value ${option.Value}`;
            }
          });
          logger.debug(`Found global option set ${response.OptionSetName} for field ${fieldName} in ${tableName} (not in schema - consider adding to schema)`);
          return values;
        }
      }

      // Check for local option set
      const optionSetMetadata = response.OptionSet;
      if (optionSetMetadata && optionSetMetadata.Options) {
        const values = {};
        optionSetMetadata.Options.forEach(option => {
          if (option.Value != null) {
            values[option.Value] = option.Label?.UserLocalizedLabel?.Label || option.Label || `Value ${option.Value}`;
          }
        });
        logger.debug(`Found local option set for field ${fieldName} in ${tableName} (not in schema - consider adding to schema)`);
        return values;
      }

      // If field is text but might reference a global option set by convention,
      // try to find a global option set with a related name (e.g., "DocType", "new_doctype")
      // This is a fallback for cases where text fields have associated global option sets
      if (fieldName.toLowerCase().includes('doctype') || columnName.toLowerCase().includes('doctype')) {
        try {
          logger.debug(`Field ${fieldName} appears to be text, checking for related global option sets...`);
          const globalOptionSets = await this.fetch('/GlobalOptionSetDefinitions');
          const relatedOptionSets = (globalOptionSets.value || []).filter(os => {
            const name = os.Name?.toLowerCase() || '';
            return name.includes('doctype') || name.includes('doc_type') || name.includes('documenttype');
          });
          
          if (relatedOptionSets.length > 0) {
            // Use the first matching global option set
            const globalOptionSet = relatedOptionSets[0];
            const values = {};
            (globalOptionSet.Options || []).forEach(option => {
              if (option.Value != null) {
                values[option.Value] = option.Label?.UserLocalizedLabel?.Label || option.Label || `Value ${option.Value}`;
              }
            });
            if (Object.keys(values).length > 0) {
              logger.info(`Found related global option set ${globalOptionSet.Name} for docType field (not in schema - consider adding to schema)`);
              return values;
            }
          }
        } catch (error) {
          logger.debug(`Failed to check for related global option sets:`, error);
        }
      }

      // No option set found
      logger.debug(`Field ${fieldName} in table ${tableName} does not have an option set`);
      return {};
    } catch (error) {
      logger.debug(`Failed to fetch option set values for ${schemaKey}.${fieldName} from Dataverse`, error);
      return {};
    }
  }

  // ===========================================================================
  // FUTURE INVENTORY FORECASTS
  // ===========================================================================

  async getFutureInventory(filters = {}) {
    const query = this.buildQuery('futureInventoryForecasts', { 
      filter: filters,
      expand: ['country', 'sku']
    });
    const result = await this.fetch(`/${getTableName('futureInventoryForecasts')}${query}`);
    const transformed = this.transformResponse('futureInventoryForecasts', result);
    return transformed.value || transformed;
  }

  async getFutureInventoryById(futureInventoryId) {
    const query = this.buildQuery('futureInventoryForecasts', {
      expand: ['country', 'sku']
    });
    const result = await this.fetch(`/${getTableName('futureInventoryForecasts')}(${futureInventoryId})${query}`);
    return this.transformResponse('futureInventoryForecasts', result);
  }

  // ===========================================================================
  // RAW AGGREGATED (ACTUAL SALES)
  // ===========================================================================

  async getRawAggregated(filters = {}) {
    const query = this.buildQuery('rawAggregated', { 
      filter: filters,
      expand: ['country', 'sku', 'distributor']
    });
    const result = await this.fetch(`/${getTableName('rawAggregated')}${query}`);
    const transformed = this.transformResponse('rawAggregated', result);
    return transformed.value || transformed;
  }

  async getRawAggregatedById(rawAggregatedId) {
    const query = this.buildQuery('rawAggregated', {
      expand: ['country', 'sku', 'distributor']
    });
    const result = await this.fetch(`/${getTableName('rawAggregated')}(${rawAggregatedId})${query}`);
    return this.transformResponse('rawAggregated', result);
  }

  // ===========================================================================
  // ACTUAL INVENTORY (Opening & Closing Stock for Actual Months)
  // ===========================================================================

  async getActualInventory(filters = {}) {
    const query = this.buildQuery('actualInventory', { 
      filter: filters,
      expand: ['country', 'sku'],
      orderby: [{ field: 'date', order: 'desc' }]
    });
    const result = await this.fetch(`/${getTableName('actualInventory')}${query}`);
    const transformed = this.transformResponse('actualInventory', result);
    return transformed.value || transformed;
  }

  async getActualInventoryById(actualInventoryId) {
    const query = this.buildQuery('actualInventory', {
      expand: ['country', 'sku']
    });
    const result = await this.fetch(`/${getTableName('actualInventory')}(${actualInventoryId})${query}`);
    return this.transformResponse('actualInventory', result);
  }

  // ===========================================================================
  // LABELS
  // ===========================================================================

  async getLabels(filters = {}) {
    const query = this.buildQuery('labels', { 
      filter: filters,
      expand: ['country']
    });
    const result = await this.fetch(`/${getTableName('labels')}${query}`);
    const transformed = this.transformResponse('labels', result);
    return transformed.value || transformed;
  }

  async getLabelById(labelId) {
    const query = this.buildQuery('labels', {
      expand: ['country']
    });
    const result = await this.fetch(`/${getTableName('labels')}(${labelId})${query}`);
    return this.transformResponse('labels', result);
  }

  // ===========================================================================
  // DOC TYPES
  // ===========================================================================

  async getDocTypes(filters = {}) {
    const query = this.buildQuery('docTypes', { 
      filter: filters
    });
    const result = await this.fetch(`/${getTableName('docTypes')}${query}`);
    const transformed = this.transformResponse('docTypes', result);
    return transformed.value || transformed;
  }

  async getDocTypeById(docTypeId) {
    const query = this.buildQuery('docTypes');
    const result = await this.fetch(`/${getTableName('docTypes')}(${docTypeId})${query}`);
    return this.transformResponse('docTypes', result);
  }

  // ===========================================================================
  // DOC TYPE CALCULATIONS
  // ===========================================================================

  async getDocTypeCalculations(filters = {}) {
    const query = this.buildQuery('docTypeCalculations', { 
      filter: filters
    });
    const result = await this.fetch(`/${getTableName('docTypeCalculations')}${query}`);
    const transformed = this.transformResponse('docTypeCalculations', result);
    return transformed.value || transformed;
  }

  /**
   * Get all columns (attributes) for an entity
   * Dynamically fetches all fields from entity metadata
   * 
   * @param {string} schemaKey - Schema key (e.g., 'rawAggregated')
   * @returns {Promise<Array>} - Array of field objects with {name, type, isOptionSet, optionSetName}
   */
  async getEntityColumns(schemaKey) {
    try {
      const tableName = getTableName(schemaKey);
      const entityLogicalName = await this.getEntityLogicalName(tableName);
      
      
      // Try to fetch attributes using discovered logical name
      if (entityLogicalName) {
        try {
          // Fetch without $select - OptionSetName is not a selectable property
          const response = await this.fetch(
            `/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes`
          );
          
          const attributes = response.value || [];
          const columns = attributes
            .filter(attr => {
              // Filter out system fields and only include relevant types
              const systemFields = ['createdon', 'modifiedon', 'createdby', 'modifiedby', 'ownerid', 'statecode', 'statuscode'];
              return !systemFields.includes(attr.LogicalName?.toLowerCase()) &&
                     attr.AttributeType !== 'Lookup' && // Exclude lookups for now
                     attr.AttributeType !== 'Customer' &&
                     attr.AttributeType !== 'Owner';
            })
            .map(attr => {
              // Determine if it's an option set based on AttributeType only
              // OptionSetName is not available in Attributes response
              const isOptionSet = attr.AttributeType === 'Picklist' || 
                                  attr.AttributeType === 'State' || 
                                  attr.AttributeType === 'Status';
              return {
                name: attr.LogicalName,
                columnName: attr.LogicalName,
                type: attr.AttributeType,
                isOptionSet,
                optionSetName: undefined // OptionSetName not available in Attributes response
              };
            });

          logger.info(`Fetched ${columns.length} columns for entity ${entityLogicalName}`);
          return columns;
        } catch (error) {
          logger.warn(`Failed to fetch attributes using logical name ${entityLogicalName}, trying fallbacks`, error);
          // Try fallback logical names
          const fallbackNames = [
            tableName,
            tableName.endsWith('s') ? tableName.slice(0, -1) : tableName,
            tableName.endsWith('es') ? tableName.slice(0, -2) : tableName
          ];
          
          for (const fallbackName of fallbackNames) {
            if (fallbackName === entityLogicalName) continue; // Skip if already tried
            try {
              // Fetch without $select - OptionSetName is not a selectable property
              const response = await this.fetch(
                `/EntityDefinitions(LogicalName='${fallbackName}')/Attributes`
              );
              const attributes = response.value || [];
              const columns = attributes
                .filter(attr => {
                  const systemFields = ['createdon', 'modifiedon', 'createdby', 'modifiedby', 'ownerid', 'statecode', 'statuscode'];
                  return !systemFields.includes(attr.LogicalName?.toLowerCase()) &&
                         attr.AttributeType !== 'Lookup' &&
                         attr.AttributeType !== 'Customer' &&
                         attr.AttributeType !== 'Owner';
                })
                .map(attr => {
                  // Determine if it's an option set based on AttributeType only
                  // OptionSetName is not available in Attributes response
                  const isOptionSet = attr.AttributeType === 'Picklist' || 
                                      attr.AttributeType === 'State' || 
                                      attr.AttributeType === 'Status';
                  return {
                    name: attr.LogicalName,
                    columnName: attr.LogicalName,
                    type: attr.AttributeType,
                    isOptionSet,
                    optionSetName: undefined // OptionSetName not available in Attributes response
                  };
                });
              logger.info(`Fetched ${columns.length} columns using fallback name ${fallbackName}`);
              return columns;
            } catch (fallbackError) {
              // Try next fallback
              continue;
            }
          }
        }
      }
      
      // All attempts failed - fallback to schema columns
      logger.warn(`Could not fetch columns from metadata for ${schemaKey}, using schema fallback`);
      const schema = getTableSchema(schemaKey);
      const columns = Object.keys(schema.columns || {}).map(key => ({
        name: key,
        columnName: getColumnName(schemaKey, key),
        type: schema.columns[key]?.type || 'string',
        isOptionSet: !!(schema.statusCodes?.[key]) // Check if it's an option set field
      }));
      
      // Add common fields that might be missing from schema
      if (schemaKey === 'rawAggregated') {
        // Add quantity field if not present (it might be stored in 'name' or as 'qty')
        if (!columns.find(c => c.name === 'quantity')) {
          columns.push({ name: 'quantity', columnName: 'new_quantity', type: 'decimal', isOptionSet: false });
        }
        if (!columns.find(c => c.name === 'qty')) {
          columns.push({ name: 'qty', columnName: 'new_qty', type: 'decimal', isOptionSet: false });
        }
      }
      
      return columns;
    } catch (error) {
      logger.error(`Failed to fetch columns for ${schemaKey}`, error);
      // Fallback to schema columns
      const schema = getTableSchema(schemaKey);
      return Object.keys(schema.columns || {}).map(key => ({
        name: key,
        columnName: getColumnName(schemaKey, key),
        type: schema.columns[key]?.type || 'string',
        isOptionSet: false
      }));
    }
  }

  /**
   * Get doc type option set values from raw aggregated entity metadata
   * Uses dynamic entity discovery to find the correct entity logical name
   * Returns a map of option set value (number) to label (string)
   * 
   * Note: docType may use a global option set even if not in schema statusCodes
   */
  async getDocTypeOptionSetValues() {
    // Always try to fetch from Dataverse - it may be a global option set
    // even if not configured in schema statusCodes
    return this.getFieldOptionSetValues('rawAggregated', 'docType');
  }

  async createLabel(labelData) {
    const schema = getTableSchema('labels');
    const payload = {};
    
    for (const [key, value] of Object.entries(labelData)) {
      if (key === 'countryId' && value) {
        Object.assign(payload, getLookupBinding('labels', 'country', value));
      } else if (schema.columns[key]) {
        payload[getColumnName('labels', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('labels')}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('labels', result);
  }

  async updateLabel(labelId, updates) {
    const schema = getTableSchema('labels');
    const payload = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'countryId' && value) {
        Object.assign(payload, getLookupBinding('labels', 'country', value));
      } else if (schema.columns[key] && value !== undefined) {
        payload[getColumnName('labels', key)] = value;
      }
    }
    
    const result = await this.fetch(`/${getTableName('labels')}(${labelId})`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return this.transformResponse('labels', result);
  }

  async deleteLabel(labelId) {
    return this.fetch(`/${getTableName('labels')}(${labelId})`, {
      method: 'DELETE'
    });
  }
}

// Export singleton instance
export default new DataverseDataService();
