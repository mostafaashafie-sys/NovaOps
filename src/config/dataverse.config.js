/**
 * Dataverse Configuration
 * Centralized configuration for Dataverse API connections
 */
export const DataverseConfig = {
  baseUrl: 'https://YOUR_ORG.crm.dynamics.com/api/data/v9.2',
  tables: {
    countries: 'new_countries',
    skus: 'new_skus',
    orders: 'new_orders',
    orderItems: 'new_orderitems',
    purchaseOrders: 'new_purchaseorders',
    forecasts: 'new_forecasts',
    allocations: 'new_allocations',
    shipments: 'new_shipments',
    inventory: 'new_inventory',
    settings: 'new_settings'
  },
  statusCodes: {
    // OrderItem Statuses
    forecasted: 100000000,
    planned: 100000001,
    confirmedToUP: 100000002,
    partiallyAllocated: 100000003,
    fullyAllocated: 100000004,
    shipped: 100000005,
    received: 100000006,
    
    // PO Statuses
    poDraft: 200000000,
    poApprovalRequested: 200000001,
    poApproved: 200000002,
    poRejected: 200000003,
    poConfirmedToUP: 200000004,
    poShipped: 200000005,
    poReceived: 200000006
  }
};

