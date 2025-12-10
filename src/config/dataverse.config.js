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
    settings: 'new_settings',
    labels: 'new_labels'
  },
  statusCodes: {
    // OrderItem Statuses (matching documentation)
    forecasted: 1,                    // Forecasted
    planned: 2,                       // Planned
    pendingRegulatory: 3,            // Pending Regulatory
    regulatoryApproved: 4,           // Regulatory Approved
    backOrder: 5,                     // Back Order
    allocatedToMarket: 6,            // Allocated to Market
    shippedToMarket: 7,               // Shipped to Market
    arrivedToMarket: 8,               // Arrived to Market
    deleted: 9,                       // Deleted
    
    // PO Statuses (matching documentation)
    poDraft: 1,                      // Draft
    poPendingCFOApproval: 2,         // Pending CFO Approval
    poCFOApproved: 3,                 // CFO Approved
    poConfirmedToUP: 4,              // Confirmed to UP
    poCompleted: 5                    // Completed
  }
};

