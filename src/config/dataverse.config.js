/**
 * Dataverse Configuration
 * Centralized configuration for Dataverse API connections
 * Based on actual schema from AutoForecast Azure Function
 * 
 * Environment Variables:
 * - Local Dev: VITE_DATAVERSE_URL (from .env file)
 * - Production: VITE_DATAVERSE_URL (set during build in Azure)
 * 
 * Note: In Azure Web App, set VITE_DATAVERSE_URL as an application setting
 * during the build process, or use DATAVERSE_URL and map it in build script.
 */
export const DataverseConfig = {
  // For Vite: Use VITE_DATAVERSE_URL (must start with VITE_ to be exposed)
  // Fallback to production DATAVERSE_URL if available (for build-time injection)
  baseUrl: import.meta.env.VITE_DATAVERSE_URL || 
           import.meta.env.DATAVERSE_URL || 
           'https://mostafashafie-uaesenvironment.crm4.dynamics.com/api/data/v9.2',
  
  // Table names (matching actual Dataverse schema from Azure Function)
  tables: {
    // Master data tables
    skuTables: 'new_skutables',                // Plural - verified from Azure Function
    countryTables: 'new_countrytables',        // Plural - verified from Azure Function
    
    // Transaction tables
    orderItemses: 'new_orderitemses',          // With 'es' - verified from Azure Function
    orders: 'new_orderses',                    // With 'es' - verified from Dataverse API service document
    forecastTables: 'new_forecasttables',      // Plural - verified from Azure Function
    budgetTables: 'new_budgettables',          // Plural - verified from Azure Function
    allowedOrderMonthses: 'new_allowedordermonthses', // With 'es' - verified from Azure Function
    stockAgingReportTables: 'new_stockagingreporttables', // Plural - verified from Azure Function
    futureInventoryForecasts: 'new_futureinventoryforecasts',
    shippingTable: 'new_shippingtables',          // Plural - verified from Dataverse API service document
    skuCountryAssignment: 'new_skucountryassignments', // Plural - verified from Dataverse API service document
    targetCoverStock: 'new_targetcoverstocks',    // Plural - verified from Dataverse API service document
    procurementSafeMargin: 'new_procurementsafemargins', // Plural - verified from Dataverse API service document
    rawAggregated: 'new_rawaggregateds',          // With 's' - verified from Dataverse API service document
    forecastLog: 'new_forecastlogs',             // Plural - verified from Dataverse API service document
    distributorTable: 'new_distributortables',    // Plural - verified from Dataverse API service document
    docType: 'new_doctypes',                      // Plural - verified from Dataverse API service document
    docTypeCalculations: 'new_doctypecalculationses', // With 'es' - verified from Dataverse API service document
    labels: 'new_labelses',                       // With 'es' - verified from Dataverse API service document
    warehouses: 'new_warehousetables',            // Plural - verified from Dataverse API service document
    
    // Legacy/alternative names (for backward compatibility)
    countries: 'new_countrytables',            // Plural - verified from Azure Function
    skus: 'new_skutables',                     // Plural - verified from Azure Function
    orderItems: 'new_orderitemses',            // With 'es' - verified from Azure Function
    purchaseOrders: 'new_orderses',            // With 'es' - verified from Dataverse API service document
    forecasts: 'new_forecasttables',            // Plural - verified from Azure Function
    budgets: 'new_budgettables',               // Plural - verified from Azure Function
    shipments: 'new_shippingtables',             // Plural - verified from Dataverse API service document
    
    // Note: There is NO separate allocations table
    // Allocations are handled through OrderItems table by updating status
  },
  
  // Column name mappings (based on Excel exports - Display Name → Logical Name)
  // IMPORTANT: Dataverse API uses logical names (lowercase, no spaces)
  columns: {
    // SKU Table (new_skutables)
    sku: {
      id: 'new_skutableid',                      // Primary key
      name: 'new_skuname',                       // SKU Name
      skuId: 'new_skuid',                        // SKU ID
      numberOfTinsPerCarton: 'new_numberoftinspercarton', // Number of Tins per Carton
      diseaseArea: 'new_diseasearea',            // Disease Area
      skuCategory: 'new_skucategory',            // SKU Category
      sortOrder: 'new_sortorder',                // Sort Order
      tinSize: 'new_tinsize',                    // Tin Size
      status: 'new_status'                       // Status
    },
    
    // Order Items Table (new_orderitems)
    orderItems: {
      id: 'new_orderitemid',                    // Order item ID (Primary key)
      sku: 'new_SKU',                            // SKU (Lookup field for expand)
      country: 'new_Country',                    // Country (Lookup field for expand)
      skuValue: '_new_sku_value',                // SKU filter field (GUID)
      countryValue: '_new_country_value',        // Country filter field (GUID)
      order: 'new_Order',                        // Order (Lookup to Orders table)
      orderValue: '_new_order_value',            // Order filter field (GUID)
      shippingId: 'new_ShippingID',             // Shipping ID (Lookup)
      shippingIdValue: '_new_shippingid_value',  // Shipping ID filter field (GUID)
      label: 'new_Label',                        // Label (Lookup)
      labelValue: '_new_label_value',            // Label filter field (GUID)
      year: 'new_year',                          // Year
      month: 'new_month',                        // Month
      date: 'new_date',                          // Date
      quantity: 'new_orderitemqty',              // Order Item Qty
      qtyInCartons: 'new_qtyincartons',          // Qty in Cartons
      allocatedQuantity: 'new_allocatedquantity', // Allocated Quantity
      remainingQuantity: 'new_remainingquantity', // Remaining Quantity
      orderPlacementStatus: 'new_orderplacementstatus', // Order Placement Status
      orderStatus: 'new_orderstatus', // Order Status (separate from orderPlacementStatus)
      channel: 'new_channel',                    // Channel
      tender: 'new_tender',                      // Tender
      upCode: 'new_upcode',                      // UP Code
      comments: 'new_comments',                  // Comments
      status: 'new_status'                       // Status
    },
    
    // Orders Table (new_orders) - Purchase Orders
    orders: {
      id: 'new_orderid',                        // Order ID (Primary key)
      poId: 'new_poid',                          // PO ID
      date: 'new_date',                          // Date
      deliveryDate: 'new_deliverydate',          // Delivery Date
      orderStatus: 'new_status',                 // Order Status (changed from new_orderstatus)
      totalOrderQty: 'new_totalorderqty',        // Total Order Qty
      destination: 'new_Destination',            // Destination (Lookup)
      destinationValue: '_new_destination_value', // Destination filter field (GUID)
      month: 'new_month',                        // Month
      year: 'new_year',                          // Year
      status: 'new_status'                       // Status
    },
    
    // Shipping Table (new_shippingtable)
    shipments: {
      id: 'new_shipmentid',                     // Shipment ID (Primary key)
      shipmentNumber: 'new_shipmentnumber',      // Shipment Number
      deliveryDate: 'new_deliverydate',          // Delivery Date
      status: 'new_status',                      // Shipment status (not status2)
      country: 'new_Country',                    // Country (Lookup)
      countryValue: '_new_country_value',        // Country filter field (GUID)
      destination: 'new_Destination',            // Destination (Lookup)
      destinationValue: '_new_destination_value', // Destination filter field (GUID)
      month: 'new_month',                        // Month
      year: 'new_year',                          // Year
      status: 'new_status'                       // Status
    },
    
    // Country Table (new_countrytables)
    country: {
      id: 'new_countrytableid',                 // Primary key
      name: 'new_countryname',                   // Country Name
      countryId: 'new_countryid',                // Country ID
      currency: 'new_currency',                  // Currency
      region: 'new_region',                      // Region
      status: 'new_status'                       // Status
    },
    
    // Forecast Table (new_forecasttable)
    forecast: {
      id: 'new_forecastid',                     // Forecast ID (Primary key)
      sku: 'new_SKU',                            // SKU (Lookup)
      country: 'new_Country',                    // Country (Lookup)
      skuValue: '_new_sku_value',                // SKU filter field (GUID)
      countryValue: '_new_country_value',        // Country filter field (GUID)
      quantity: 'new_forecastquantity',          // Forecast Quantity
      quantityInCartons: 'new_forecastquantityincartons', // Forecast Quantity in Cartons
      year: 'new_year',                          // Year
      month: 'new_month',                        // Month
      monthYear: 'new_monthyear',                // Month-Year
      channel: 'new_channel',                    // Channel
      status: 'new_forecaststatus',              // Forecast Status
      systemGeneratedOrder: 'new_systemgeneratedorder', // System Generated Order
      statusReason: 'new_status'                 // Status
    },
    
    // Budget Table (new_budgettable)
    budget: {
      id: 'new_budgetid',                       // Budget ID (Primary key)
      sku: 'new_SKU',                            // SKU (Lookup)
      country: 'new_Country',                    // Country (Lookup)
      skuValue: '_new_sku_value',                // SKU filter field (GUID)
      countryValue: '_new_country_value',        // Country filter field (GUID)
      quantity: 'new_budgetedquantity',          // Budgeted Quantity
      quantityInCartons: 'new_budgetedquantityincartons', // Budgeted Quantity in Cartons
      year: 'new_year',                          // Year
      month: 'new_month',                        // Month
      monthYear: 'new_monthyear',                // Month-Year
      channel: 'new_channel',                    // Channel
      status: 'new_status'                       // Status
    },
    
    // Stock Aging Report Table (new_stockagingreporttable)
    stockAging: {
      id: 'new_stockagingreportid',             // Stock Aging Report ID (Primary key)
      sku: 'new_SKU',                            // SKU (Lookup)
      country: 'new_Country',                    // Country (Lookup)
      skuValue: '_new_sku_value',                // SKU filter field (GUID)
      countryValue: '_new_country_value',        // Country filter field (GUID)
      nearExpiryQty: 'new_nearexpiryquantity',   // Near Expiry Quantity
      expiryDate: 'new_expirydate',              // Expiry Date
      batchNo: 'new_batchno',                    // Batch No
      monthYear: 'new_monthyear',                // Month-Year
      distributor: 'new_Distributor',            // Distributor (Lookup)
      warehouse: 'new_Warehouse'                 // Warehouse (Lookup)
    },
    
    // Allowed Order Months (new_allowedordermonthses)
    allowedOrderMonths: {
      id: 'new_allowedordermonthsid',           // Primary key
      sku: 'new_SKU',                            // SKU (Lookup)
      country: 'new_Country',                    // Country (Lookup)
      skuValue: '_new_sku_value',                // SKU filter field (GUID)
      countryValue: '_new_country_value',        // Country filter field (GUID)
      month: 'new_month',                        // Month
      status: 'new_status'                       // Status
    }
  },
  
  // Order Status Codes (from AutoForecast Azure Function)
  orderStatus: {
    SYSTEM_GENERATED: 100000000,
    PLANNED_BY_LO: 100000001,
    PENDING_RO_APPROVAL: 100000002,
    APPROVED: 100000003,
    CONFIRMED_TO_UP: 100000005,
    BACK_ORDER: 100000006,
    REMAINING_FOR_SHIPPING: 100000010
  },
  
  // Channel Codes
  channels: {
    DEFAULT: 100000000
  },
  
  // Legacy status codes (for backward compatibility)
  statusCodes: {
    // OrderItem Statuses
    forecasted: 1,
    planned: 2,
    pendingRegulatory: 3,
    regulatoryApproved: 4,
    orderApproved: 5,
    backOrder: 6,
    allocatedToMarket: 7,
    shippedToMarket: 8,
    arrivedToMarket: 9,
    deleted: 10,
    
    // PO Statuses
    poDraft: 1,
    poPendingCFOApproval: 2,
    poCFOApproved: 3,
    poConfirmedToUP: 4,
    poCompleted: 5
  }
};

