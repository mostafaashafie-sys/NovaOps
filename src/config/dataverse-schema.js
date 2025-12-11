/**
 * Dataverse Schema Configuration
 * Based on DATAVERSE_SCHEMA_MAPPING.md - Single Source of Truth
 * 
 * This file defines the complete Dataverse schema structure including:
 * - Table names
 * - Column mappings (friendly names → Dataverse logical names)
 * - Primary keys
 * - Lookup relationships
 * - Status codes/option sets
 * - Default select fields
 */

export const DataverseSchema = {
  // ===========================================================================
  // COUNTRIES
  // ===========================================================================
  countries: {
    tableName: 'new_countrytables', // Plural - matches Azure Function
    primaryKey: 'new_countrytableid',
    columns: {
      id: 'new_countrytableid',
      name: 'new_countryname',
      countryId: 'new_countryid',
      region: 'new_region',
      currency: 'new_currency',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      sku: 'new_SKU@odata.bind',
    },
    filterFields: {
      sku: '_new_sku_value',
    },
    statusCodes: {
      currency: {
        1: 'Saudi Riyal (SAR)',
        2: 'Yemeni Rial (YER)',
        3: 'UAE Dirham (AED)',
        4: 'Bahraini Dinar (BHD)',
        5: 'Kuwaiti Dinar (KWD)',
        6: 'Omani Rial (OMR)',
        7: 'Qatari Riyal (QAR)',
        8: 'Lebanese Pound (LBP)',
        9: 'Iraqi Dinar (IQD)',
        10: 'US Dollar (USD)',
      },
      region: {
        100000000: 'GCC',
        100000001: 'Levant',
      },
    },
    defaultSelect: ['new_countrytableid', 'new_countryname', 'new_countryid', 'new_region', 'new_currency'],
  },

  // ===========================================================================
  // SKUs
  // ===========================================================================
  skus: {
    tableName: 'new_skutables', // Plural - matches Azure Function
    primaryKey: 'new_skutableid',
    columns: {
      id: 'new_skutableid',
      name: 'new_skuname',
      skuId: 'new_skuid',
      category: 'new_skucategory',
      tinSize: 'new_tinsize',
      tinsPerCarton: 'new_numberoftinspercarton',
      diseaseArea: 'new_diseasearea',
      sortOrder: 'new_sortorder',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {},
    filterFields: {},
    statusCodes: {
      diseaseArea: {
        100000000: 'Infant Formula',
        100000001: 'Follow-on Formula',
        100000002: 'Growing-up Formula',
        100000003: 'Allergy Formula',
        100000004: 'Constipation Formula',
        100000005: 'Regurgitation Formula',
        100000006: 'Diarrhea Formula',
        100000007: 'Colic Formula',
      },
      category: {
        1: 'Standard',
        2: 'Genio',
        3: 'Special',
        4: 'RTF',
        5: 'Gimmicks',
      },
      status: {
        1: 'Active',
        2: 'Inactive',
        3: 'Archived',
      },
    },
    defaultSelect: ['new_skutableid', 'new_skuname', 'new_skuid', 'new_skucategory', 'new_tinsize', 'new_numberoftinspercarton', 'new_sortorder'],
  },

  // ===========================================================================
  // ORDERS (Purchase Orders)
  // ===========================================================================
  orders: {
    tableName: 'new_orderses', // With 'es' - verified from Dataverse API service document
    primaryKey: 'new_ordersid',
    columns: {
      id: 'new_ordersid',
      name: 'new_orderid',
      date: 'new_date',
      deliveryDate: 'new_deliverydate',
      month: 'new_month',
      year: 'new_year',
      orderStatus: 'new_status', // Changed from new_orderstatus - column doesn't exist in Dataverse
      poId: 'new_poid',
      totalOrderQty: 'new_totalorderqty',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      destination: 'new_Destination@odata.bind',
    },
    filterFields: {
      destination: '_new_destination_value',
    },
    statusCodes: {
      orderStatus: {
        100000000: 'Open',
        100000001: 'Pending CFO Approval',
        100000002: 'Approved',
        100000003: 'Completed',
        100000004: 'Confirmed to UP',
      },
    },
    defaultSelect: ['new_ordersid', 'new_orderid', 'new_date', 'new_deliverydate', 'new_status', 'new_poid', 'new_totalorderqty', 'new_month', 'new_year'],
  },

  // ===========================================================================
  // ORDER ITEMS
  // ===========================================================================
  orderItems: {
    tableName: 'new_orderitemses', // With 'es' - matches Azure Function
    primaryKey: 'new_orderitemsid',
    columns: {
      id: 'new_orderitemsid',
      name: 'new_orderitemid',
      channel: 'new_channel',
      date: 'new_date',
      month: 'new_month',
      year: 'new_year',
      orderItemQty: 'new_orderitemqty',
      qtyInCartons: 'new_qtyincartons',
      allocatedQty: 'new_allocatedquantity',
      remainingQty: 'new_remainingquantity',
      orderPlacementStatus: 'new_orderplacementstatus',
      orderStatus: 'new_orderstatus', // Order status (separate from orderPlacementStatus)
      tender: 'new_tender',
      upCode: 'new_upcode',
      comments: 'new_comments',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
      order: 'new_Order@odata.bind',
      shipping: 'new_ShippingID@odata.bind',
      label: 'new_Label@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
      order: '_new_order_value',
      shipping: '_new_shippingid_value',
      label: '_new_label_value',
    },
    statusCodes: {
      orderPlacementStatus: {
        100000000: 'System Forecasted Order',
        100000001: 'Planned By LO',
        100000002: 'Confirmed Pending RO Approval',
        100000003: 'RO Approved Pending CFO Approval',
        100000004: 'Approved',
        100000005: 'Confirmed to UP',
        100000006: 'Back Order',
        100000007: 'Allocation Pending RO Approval',
        100000008: 'Allocated To Market',
        100000009: 'Shipped To Market',
        100000010: 'Remaining For Shipping',
        100000011: 'Completed',
        100000012: 'Item Approved Pending PO Approval',
      },
      channel: {
        100000000: 'Private',
        100000001: 'Tender',
        100000002: 'Offers',
      },
    },
    defaultSelect: ['new_orderitemsid', 'new_orderitemid', 'new_orderitemqty', 'new_qtyincartons', 'new_orderplacementstatus', 'new_orderstatus', 'new_channel', 'new_month', 'new_year', '_new_country_value', '_new_sku_value', '_new_order_value'],
  },

  // ===========================================================================
  // FORECASTS
  // ===========================================================================
  forecasts: {
    tableName: 'new_forecasttables', // Plural - matches Azure Function
    primaryKey: 'new_forecasttableid',
    columns: {
      id: 'new_forecasttableid',
      name: 'new_forecastid',
      forecastQty: 'new_forecastquantity',
      forecastQtyCartons: 'new_forecastquantityincartons',
      forecastStatus: 'new_forecaststatus',
      channel: 'new_channel',
      month: 'new_month',
      year: 'new_year',
      monthYear: 'new_monthyear',
      systemGeneratedOrder: 'new_systemgeneratedorder',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
    },
    statusCodes: {
      forecastStatus: {
        100000000: 'Submitted',
        100000001: 'Approved',
        100000002: 'System Forecasted',
      },
      channel: {
        100000000: 'Private',
        100000001: 'Tender',
        100000002: 'Offers',
      },
    },
    defaultSelect: ['new_forecasttableid', 'new_forecastid', 'new_forecastquantity', 'new_forecastquantityincartons', 'new_forecaststatus', 'new_channel', 'new_month', 'new_year', '_new_country_value', '_new_sku_value'],
  },

  // ===========================================================================
  // BUDGETS
  // ===========================================================================
  budgets: {
    tableName: 'new_budgettables', // Plural - matches Azure Function
    primaryKey: 'new_budgettableid',
    columns: {
      id: 'new_budgettableid',
      name: 'new_budgetid',
      budgetedQty: 'new_budgetedquantity',
      budgetedQtyCartons: 'new_budgetedquantityincartons',
      channel: 'new_channel',
      month: 'new_month',
      year: 'new_year',
      monthYear: 'new_monthyear',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
    },
    statusCodes: {
      channel: {
        100000000: 'Private',
        100000001: 'Tender',
        100000002: 'Offers',
      },
    },
    defaultSelect: ['new_budgettableid', 'new_budgetid', 'new_budgetedquantity', 'new_budgetedquantityincartons', 'new_channel', 'new_month', 'new_year'],
  },

  // ===========================================================================
  // SHIPMENTS
  // ===========================================================================
  shipments: {
    tableName: 'new_shippingtables', // Plural - matches Azure Function
    primaryKey: 'new_shippingtableid',
    columns: {
      id: 'new_shippingtableid',
      name: 'new_shipmentid',
      shipmentNumber: 'new_shipmentnumber',
      deliveryDate: 'new_deliverydate',
      month: 'new_month',
      year: 'new_year', // Note: Type is String in Dataverse, not Int32
      status: 'new_status', // Shipment status (not status2)
      statecode: 'statecode', // System status
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      destination: 'new_Destination@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      destination: '_new_destination_value',
    },
    statusCodes: {
      status: {
        100000001: 'In Transit',
        100000002: 'Delivered',
      },
    },
    defaultSelect: ['new_shippingtableid', 'new_shipmentid', 'new_shipmentnumber', 'new_deliverydate', 'new_month', 'new_year', '_new_country_value', '_new_destination_value'],
  },

  // ===========================================================================
  // ALLOWED ORDER MONTHS
  // ===========================================================================
  allowedOrderMonths: {
    tableName: 'new_allowedordermonthses', // With 'es' - matches Azure Function
    primaryKey: 'new_allowedordermonthsid',
    columns: {
      id: 'new_allowedordermonthsid',
      name: 'new_name',
      month: 'new_month',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
    },
    statusCodes: {},
    defaultSelect: ['new_allowedordermonthsid', 'new_name', 'new_month', '_new_country_value', '_new_sku_value'],
  },

  // ===========================================================================
  // STOCK AGING REPORTS
  // ===========================================================================
  stockAgingReports: {
    tableName: 'new_stockagingreporttables',
    primaryKey: 'new_stockagingreporttableid',
    columns: {
      id: 'new_stockagingreporttableid',
      name: 'new_stockagingreportid',
      batchNo: 'new_batchno',
      expiryDate: 'new_expirydate',
      nearExpiryQty: 'new_nearexpiryquantity',
      monthYear: 'new_monthyear',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
      distributor: 'new_Distributor@odata.bind',
      warehouse: 'new_Warehouse@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
      distributor: '_new_distributor_value',
      warehouse: '_new_warehouse_value',
    },
    statusCodes: {},
    defaultSelect: ['new_stockagingreporttableid', 'new_stockagingreportid', 'new_batchno', 'new_expirydate', 'new_nearexpiryquantity', '_new_country_value', '_new_sku_value'],
  },

  // ===========================================================================
  // FORECAST LOGS
  // ===========================================================================
  forecastLogs: {
    tableName: 'new_forecastlogs',
    primaryKey: 'new_forecastlogid',
    columns: {
      id: 'new_forecastlogid',
      name: 'new_name',
      date: 'new_date',
      qty: 'new_qty',
      qtyInCartons: 'new_qtyincartons',
      approvalStatus: 'new_approvalstatus',
      month: 'new_month',
      year: 'new_year',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
    },
    statusCodes: {
      approvalStatus: {
        100000000: 'Submitted',
        100000001: 'Approved by LO',
        100000002: 'Approved By CFO',
      },
    },
    defaultSelect: ['new_forecastlogid', 'new_name', 'new_qty', 'new_qtyincartons', 'new_approvalstatus', 'new_month', 'new_year'],
  },

  // ===========================================================================
  // TARGET COVER STOCK
  // ===========================================================================
  targetCoverStock: {
    tableName: 'new_targetcoverstocks',
    primaryKey: 'new_targetcoverstockid',
    columns: {
      id: 'new_targetcoverstockid',
      name: 'new_name',
      noOfMonths: 'new_noofmonths',
      orderFrequency: 'new_orderfrequency',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
    },
    statusCodes: {},
    defaultSelect: ['new_targetcoverstockid', 'new_name', 'new_noofmonths', 'new_orderfrequency', '_new_country_value', '_new_sku_value'],
  },

  // ===========================================================================
  // PROCUREMENT SAFE MARGIN
  // ===========================================================================
  procurementSafeMargin: {
    tableName: 'new_procurementsafemargins',
    primaryKey: 'new_procurementsafemarginid',
    columns: {
      id: 'new_procurementsafemarginid',
      name: 'new_name',
      margin: 'new_margin',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
    },
    statusCodes: {},
    defaultSelect: ['new_procurementsafemarginid', 'new_name', 'new_margin', '_new_country_value'],
  },

  // ===========================================================================
  // SKU COUNTRY ASSIGNMENT
  // ===========================================================================
  skuCountryAssignments: {
    tableName: 'new_skucountryassignments',
    primaryKey: 'new_skucountryassignmentid',
    columns: {
      id: 'new_skucountryassignmentid',
      name: 'new_name',
      inForecast: 'new_inforecast',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
    },
    statusCodes: {},
    defaultSelect: ['new_skucountryassignmentid', 'new_name', 'new_inforecast', '_new_country_value', '_new_sku_value'],
  },

  // ===========================================================================
  // FUTURE INVENTORY FORECASTS
  // ===========================================================================
  futureInventoryForecasts: {
    tableName: 'new_futureinventoryforecasts',
    primaryKey: 'new_futureinventoryforecastid',
    columns: {
      id: 'new_futureinventoryforecastid',
      date: 'new_date',
      futureOpeningStock: 'new_futureopeningstock',
      futureClosingStock: 'new_futureclosingstock',
      calculatedConsumption: 'new_calculatedconsumption',
      atRiskQuantity: 'new_atriskquantity',
      nonSellableQuantity: 'new_nonsellablequantity',
      requiredInventory: 'new_requiredinventory',
      coverStock: 'new_coverstock',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
    },
    statusCodes: {},
    defaultSelect: ['new_futureinventoryforecastid', 'new_date', 'new_futureopeningstock', 'new_futureclosingstock', 'new_calculatedconsumption', 'new_atriskquantity', 'new_nonsellablequantity', 'new_requiredinventory', 'new_coverstock', '_new_country_value', '_new_sku_value'],
  },

  // ===========================================================================
  // RAW AGGREGATED (ACTUAL SALES)
  // ===========================================================================
  rawAggregated: {
    tableName: 'new_rawaggregateds', // With 's' - verified from Dataverse API service document
    primaryKey: 'new_rawaggregatedid',
    columns: {
      id: 'new_rawaggregatedid',
      name: 'new_name',
      date: 'new_date',
      channel: 'new_channel',
      docType: 'new_doctype',
      stockOutQty: 'new_stockoutquantity',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
      distributor: 'new_Distributor@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
      distributor: '_new_distributor_value',
    },
    statusCodes: {
      channel: {
        100000000: 'Private',
        100000001: 'Tender',
        100000002: 'Offers',
      },
    },
    defaultSelect: ['new_rawaggregatedid', 'new_name', 'new_date', 'new_channel', 'new_doctype', 'new_stockoutquantity', '_new_country_value', '_new_sku_value', '_new_distributor_value'],
  },

  // ===========================================================================
  // DISTRIBUTORS
  // ===========================================================================
  distributors: {
    tableName: 'new_distributortables', // Plural - verified from Dataverse API service document
    primaryKey: 'new_distributortableid',
    columns: {
      id: 'new_distributortableid',
      name: 'new_distributorname',
      distributorId: 'new_distributorid',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
    },
    statusCodes: {},
    defaultSelect: ['new_distributortableid', 'new_distributorname', 'new_distributorid', '_new_country_value'],
  },

  // ===========================================================================
  // ACTUAL INVENTORY (Opening & Closing Stock for Actual Months)
  // ===========================================================================
  actualInventory: {
    tableName: 'new_actualinventories', // Plural form (with 'ies') - verified from Dataverse API service document
    primaryKey: 'new_actualinventoryid',
    columns: {
      id: 'new_actualinventoryid',
      inventoryId: 'new_inventoryid',
      date: 'new_date',
      openingStock: 'new_openingstock',
      closingStock: 'new_closingstock',
      coverStock: 'new_coverstock',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind',
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
    },
    statusCodes: {},
    defaultSelect: ['new_actualinventoryid', 'new_inventoryid', 'new_date', 'new_openingstock', 'new_closingstock', 'new_coverstock', '_new_country_value', '_new_sku_value'],
  },

  // ===========================================================================
  // LABELS
  // ===========================================================================
  labels: {
    tableName: 'new_labelses', // With 'es' - verified from Dataverse API service document
    primaryKey: 'new_labelsid',
    columns: {
      id: 'new_labelsid',
      name: 'new_label', // Actual field name is new_label, not new_name
      labelStatus: 'new_labelstatus',
      barcode: 'new_barcode',
      expiryDate: 'new_expirydate',
      dateEffective: 'new_dateeffective',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {
      country: 'new_Country@odata.bind',
      sku: 'new_SKU@odata.bind', // Labels also link to SKUs
    },
    filterFields: {
      country: '_new_country_value',
      sku: '_new_sku_value',
    },
    statusCodes: {
      labelStatus: {
        // Add status codes if available in metadata
      },
    },
    defaultSelect: ['new_labelsid', 'new_label', 'new_labelstatus', 'new_barcode', 'new_expirydate', 'new_dateeffective', '_new_country_value', '_new_sku_value'],
  },

  // ===========================================================================
  // DOC TYPE CALCULATIONS
  // ===========================================================================
  docTypeCalculations: {
    tableName: 'new_doctypecalculationses', // With 'es' - verified from Dataverse API service document
    primaryKey: 'new_doctypecalculationsid',
    columns: {
      id: 'new_doctypecalculationsid',
      name: 'new_name',
      docType: 'new_doctype',
      docTypeSign: 'new_doctypesign',
      docTypeText: 'new_doctypetext',
      status: 'statecode',
      statusReason: 'statuscode',
      createdOn: 'createdon',
      modifiedOn: 'modifiedon',
    },
    lookups: {},
    filterFields: {},
    statusCodes: {},
    defaultSelect: ['new_doctypecalculationsid', 'new_name', 'new_doctype', 'new_doctypesign', 'new_doctypetext'],
  },
};

/**
 * Helper function to get table schema by key
 */
export function getTableSchema(schemaKey) {
  const schema = DataverseSchema[schemaKey];
  if (!schema) {
    throw new Error(`Unknown schema key: ${schemaKey}. Available keys: ${Object.keys(DataverseSchema).join(', ')}`);
  }
  return schema;
}

/**
 * Helper function to get table name by key
 */
export function getTableName(schemaKey) {
  return getTableSchema(schemaKey).tableName;
}

/**
 * Helper function to get primary key by key
 */
export function getPrimaryKey(schemaKey) {
  return getTableSchema(schemaKey).primaryKey;
}

/**
 * Helper function to map friendly column name to Dataverse column name
 */
export function getColumnName(schemaKey, friendlyName) {
  const schema = getTableSchema(schemaKey);
  return schema.columns[friendlyName] || friendlyName;
}

/**
 * Helper function to get lookup binding string
 */
export function getLookupBinding(schemaKey, lookupField, targetId) {
  const schema = getTableSchema(schemaKey);
  const lookup = schema.lookups[lookupField];
  if (!lookup) {
    throw new Error(`Unknown lookup field: ${lookupField} in ${schemaKey}`);
  }
  
  // Determine target table from lookup field name
  const targetTableMap = {
    country: 'new_countrytables',
    sku: 'new_skutables',
    order: 'new_orderses', // With 'es' - verified from Dataverse API
    shipping: 'new_shippingtables',
    destination: 'new_countrytables',
    distributor: 'new_distributortables',
    warehouse: 'new_warehousetables',
    label: 'new_labelses', // With 'es' - verified from Dataverse API service document
    actualInventory: 'new_actualinventories',
  };
  
  const targetTable = targetTableMap[lookupField] || `new_${lookupField}tables`;
  return { [lookup]: `/${targetTable}(${targetId})` };
}

/**
 * Helper function to get filter field name
 */
export function getFilterField(schemaKey, lookupField) {
  const schema = getTableSchema(schemaKey);
  return schema.filterFields[lookupField] || `_new_${lookupField}_value`;
}

