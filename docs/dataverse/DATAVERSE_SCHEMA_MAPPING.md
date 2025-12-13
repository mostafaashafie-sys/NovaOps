# Dataverse Schema Mapping - Single Source of Truth

## Overview

This document maps our codebase to the Dataverse schema. It serves as the **single source of truth** for understanding:
- What each table represents in our business logic
- How our codebase uses each table
- Column mappings between friendly names and Dataverse logical names
- Service layer usage

**Schema Files**:
- `src/config/dataverse-schema.js` - JavaScript schema configuration (used by services)
- `src/config/dataverse-schema.json` - JSON schema configuration (for reference/external tools)
- `src/services/DataverseDataService.js` - Main service using the schema

**Architecture**: All micro services (`OrderItemService`, `POService`, `ForecastService`, etc.) use the centralized `DataverseDataService`, which in turn uses the schema configuration for all Dataverse operations.

**Last Updated**: December 11, 2024  
**Schema Source**: Verified against Dataverse API Service Document, Metadata Document ($metadata), and Entity Definitions (JSON) - December 11, 2024

---

## Table of Contents

1. [Master Data Tables](#master-data-tables)
2. [Transaction Tables](#transaction-tables)
3. [Configuration Tables](#configuration-tables)
4. [Reporting Tables](#reporting-tables)
5. [Codebase Mapping](#codebase-mapping)
6. [Status Codes Reference](#status-codes-reference)

---

## Master Data Tables

### 1. Countries (`new_countrytables`)

**Schema Key**: `countries`  
**Table Name**: `new_countrytables`  
**Primary Key**: `new_countrytableid`

**Purpose**: Master data for countries/regions where we operate.

**What it stores**:
- Country names and identifiers
- Regional information (GCC, etc.)
- Currency information

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getCountries()`
- `src/hooks/useAppData.js` - Country selection
- `src/pages/*` - Country filters throughout the app

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_countrytableid` | Primary key |
| `name` | `new_countryname` | Country display name |
| `countryId` | `new_countryid` | Country identifier code |
| `region` | `new_region` | Geographic region |
| `currency` | `new_currency` | Currency code |

**Status Codes**:

**Currency** (`new_currency`):
| Code | Name |
|------|------|
| 1 | Saudi Riyal (SAR) |
| 2 | Yemeni Rial (YER) |
| 3 | UAE Dirham (AED) |
| 4 | Bahraini Dinar (BHD) |
| 5 | Kuwaiti Dinar (KWD) |
| 6 | Omani Rial (OMR) |
| 7 | Qatari Riyal (QAR) |
| 8 | Lebanese Pound (LBP) |
| 9 | Iraqi Dinar (IQD) |
| 10 | US Dollar (USD) |

**Region** (`new_region`):
| Code | Name |
|------|------|
| 100000000 | GCC |
| 100000001 | Levant |

**Lookups**:
- `new_SKU@odata.bind` - Links to SKUs

---

### 2. SKUs (`new_skutables`)

**Schema Key**: `skus`  
**Table Name**: `new_skutables`  
**Primary Key**: `new_skutableid`

**Purpose**: Master data for Stock Keeping Units (products).

**What it stores**:
- SKU names and identifiers
- Product specifications (tin size, tins per carton)
- Category and disease area classifications

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getSkus()`, `getSkuMetadata()`
- `src/services/StockCoverService.js` - SKU selection for stock cover
- `src/pages/StockManagementPage.jsx` - SKU management

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_skutableid` | Primary key |
| `name` | `new_skuname` | SKU display name |
| `skuId` | `new_skuid` | SKU identifier code |
| `tinsPerCarton` | `new_numberoftinspercarton` | **Critical**: Used for quantity calculations |
| `category` | `new_skucategory` | Product category |
| `tinSize` | `new_tinsize` | Size of individual tins |
| `diseaseArea` | `new_diseasearea` | Medical/therapeutic area |

**Status Codes**:

**Disease Area** (`new_diseasearea`):
| Code | Name |
|------|------|
| 100000000 | Infant Formula |
| 100000001 | Follow-on Formula |
| 100000002 | Growing-up Formula |
| 100000003 | Allergy Formula |
| 100000004 | Constipation Formula |
| 100000005 | Regurgitation Formula |
| 100000006 | Diarrhea Formula |
| 100000007 | Colic Formula |

**SKU Category** (`new_skucategory`):
| Code | Name |
|------|------|
| 1 | Standard |
| 2 | Genio |
| 3 | Special |
| 4 | RTF |
| 5 | Gimmicks |

**Status** (`new_status`):
| Code | Name |
|------|------|
| 1 | Active |
| 2 | Inactive |
| 3 | Archived |

**Lookups**: None

---

## Transaction Tables

### 3. Orders (`new_orderses`)

**Schema Key**: `orders`  
**Table Name**: `new_orderses` (with 'es' - **verified from Dataverse API service document**)  
**Schema Name**: `new_Orders` (capital O - used in Dataverse UI configuration)  
**Logical Name**: `new_orders` (lowercase - internal Dataverse name)  
**Primary Key**: `new_ordersid`

**Purpose**: **Purchase Orders (POs)** in our codebase. Represents a purchase order header that groups multiple order items.

**What it stores**:
- PO identifiers and dates
- Delivery dates
- Order status (Draft, Pending Approval, Approved, etc.)
- Total quantities
- Destination information

**Used in Codebase**:
- `src/services/POService.js` - All PO operations
- `src/services/DataverseDataService.js` - `getPOs()`, `createPO()`, `updatePO()`
- `src/pages/POManagementPage.jsx` - PO management UI
- `src/pages/POApprovalPage.jsx` - PO approval workflow

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_ordersid` | Primary key |
| `name` | `new_orderid` | PO identifier/name |
| `poId` | `new_poid` | PO ID (alternative identifier) |
| `date` | `new_date` | PO creation date |
| `deliveryDate` | `new_deliverydate` | Expected delivery date |
| `orderStatus` | `new_status` | **Status**: Open, Pending CFO Approval, Approved, Confirmed to UP, Completed |
| `month` | `new_month` | Delivery month |
| `year` | `new_year` | Delivery year |

**Lookups**:
- `new_Destination@odata.bind` - Links to destination country

**Status Codes**:

**Order Status** (`new_status`):
| Code | Name |
|------|------|
| 100000000 | Open |
| 100000001 | Pending CFO Approval |
| 100000002 | Approved |
| 100000003 | Completed |
| 100000004 | Confirmed to UP |

**Business Logic**:
- One Order (PO) contains multiple OrderItems
- One Order is for one country
- Status workflow: Open → Pending CFO Approval → Approved → Confirmed to UP → Completed
- All OrderItems in a PO must be Regulatory Approved before requesting CFO approval
- Link OrderItems via `new_Order@odata.bind` lookup field in OrderItems table
- Filter OrderItems by PO using `orderId` (automatically mapped to `_new_order_value`)

**Data Quality Rules**:
- ✅ **Always use names, never IDs**: Destination lookup is expanded to get country name
- ✅ **GUID validation**: Service layer validates and prevents GUIDs from being displayed as PO names
- ✅ **Name priority**: name > poId > id (but name should never be a GUID)
- ✅ **Constants usage**: Status codes should use `PO_STATUS` from `app.constants.js`

---

### 4. OrderItems (`new_orderitemses`)

**Schema Key**: `orderItems`  
**Table Name**: `new_orderitemses` (with 'es' - matches Azure Function)  
**Primary Key**: `new_orderitemsid`

**Purpose**: **SKU orders we place**. Individual line items that belong to a Purchase Order. This table handles the entire order lifecycle including allocations.

**What it stores**:
- Individual order line items
- SKU and country references
- Quantities (total, allocated, remaining)
- Order placement and allocation statuses
- Links to Orders (POs), Shipping, Labels

**Used in Codebase**:
- `src/services/OrderItemService.js` - All order item operations
- `src/services/DataverseDataService.js` - `getOrderItems()`, `createOrderItem()`, `updateOrderItem()`
- `src/services/AllocationService.js` - **Allocations are handled here** (no separate table)
- `src/components/OrderManagement/` - Order item management UI
- `src/pages/StockManagementPage.jsx` - Order item display

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_orderitemsid` | Primary key (GUID) |
| `name` | `new_orderitemid` | Order item identifier |
| `orderItemQty` | `new_orderitemqty` | Total quantity ordered (in tins) |
| `qtyInCartons` | `new_qtyincartons` | Quantity in cartons (calculated or stored) |
| `qtyCartons` | `new_qtyincartons` | Alias for qtyInCartons (for backward compatibility) |
| `allocatedQty` | `new_allocatedquantity` | **Allocated quantity** (for partial allocations) - Type: Int32 |
| `remainingQty` | `new_remainingquantity` | **Remaining quantity** (for partial allocations) - Type: Decimal |
| `orderPlacementStatus` | `new_orderplacementstatus` | **Status code**: 100000000-100000012 (see Status Codes below) - Order placement/approval workflow |
| `orderStatus` | `new_orderstatus` | **Order status code**: Additional status field (separate from orderPlacementStatus) - **Note**: `orderAllocationStatus` field does NOT exist in Dataverse |
| `status` | (derived) | **Status name**: String representation of orderPlacementStatus (e.g., 'Planned', 'Back Order') |
| `date` | `new_date` | Order item date |
| `month` | `new_month` | Delivery month (1-12) |
| `year` | `new_year` | Delivery year |
| `deliveryMonth` | (derived) | Delivery month in YYYY-MM format (e.g., '2025-01') |
| `upCode` | `new_upcode` | UP code |
| `comments` | `new_comments` | Comments/notes |
| `channel` | `new_channel` | Channel code (100000000=Private, 100000001=Tender, 100000002=Offers) |
| `tender` | `new_tender` | Tender flag |

**Lookups** (Always Expanded for Names):
- `new_Country@odata.bind` - Links to Country (expanded to get `countryName`, `countryId`)
- `new_SKU@odata.bind` - Links to SKU (expanded to get `skuName`, `skuId`, `tinsPerCarton`)
- `new_Order@odata.bind` - Links to Order/PO (expanded to get `poName`, `poId`, `orderId`)
- `new_ShippingID@odata.bind` - Links to Shipping record (expanded to get `shipmentName`, `shippingId`)
- `new_Label@odata.bind` - Links to Label/regulatory (expanded to get `labelName`, `labelId`)

**Important**: All lookups are automatically expanded when fetching order items to ensure **names are always available** instead of just GUIDs. The `DataverseDataService.calculateOrderItemFields()` method extracts and validates names, ensuring GUIDs are never displayed to users.

**Filter Fields** (for queries):
- `_new_country_value` - Filter by country GUID (use `countryId` in service calls - automatically mapped)
- `_new_sku_value` - Filter by SKU GUID (use `skuId` in service calls - automatically mapped)
- `_new_order_value` - Filter by Order (PO) GUID (use `orderId` in service calls - automatically mapped)
- `_new_shippingid_value` - Filter by Shipping GUID (use `shippingId` in service calls - automatically mapped)
- `_new_label_value` - Filter by Label GUID (use `labelId` in service calls - automatically mapped)

**Note**: The `DataverseDataService` automatically maps friendly filter names (like `countryId`, `skuId`) to the correct Dataverse filter fields (like `_new_country_value`, `_new_sku_value`). You can use either format in your code.

**Status Codes**:

**Order Placement Status** (`new_orderplacementstatus`):
| Code | Name |
|------|------|
| 100000000 | System Forecasted Order |
| 100000001 | Planned By LO |
| 100000002 | Confirmed Pending RO Approval |
| 100000003 | RO Approved Pending CFO Approval |
| 100000004 | Approved |
| 100000005 | Confirmed to UP |
| 100000006 | Back Order |
| 100000007 | Allocation Pending RO Approval |
| 100000008 | Allocated To Market |
| 100000009 | Shipped To Market |
| 100000010 | Remaining For Shipping |
| 100000011 | Completed |
| 100000012 | Item Approved Pending PO Approval |

**Channel** (`new_channel`):
| Code | Name |
|------|------|
| 100000000 | Private |
| 100000001 | Tender |
| 100000002 | Offers |

**Business Logic**:
- **Allocations**: There is NO separate allocations table. Allocations are handled by:
  - Updating `orderPlacementStatus` field
  - When user allocates some of the quantities, we split the order item  
  - Creating new OrderItems when pushing remaining quantity to different months
- **Status Flow**: System Forecasted Order → Planned By LO → Confirmed Pending RO Approval → RO Approved Pending CFO Approval → Approved → Confirmed to UP → Back Order → Allocation Pending RO Approval → Allocated To Market → Shipped To Market → Completed
- **Relationship**: Many OrderItems belong to one Order (PO)
  - Link via `new_Order@odata.bind` lookup field
  - Filter by PO using `orderId` (automatically mapped to `_new_order_value`)
  - Always expand `order` lookup to get `poName` (never display GUIDs)

**Data Quality Rules**:
- ✅ **Always use names, never IDs**: All lookups are expanded to get names
- ✅ **GUID validation**: Service layer validates and prevents GUIDs from being displayed
- ✅ **Name priority**: countryName > name > id, skuName > name > id, poName > poId > id
- ✅ **Constants usage**: Status codes should use `ORDER_ITEM_STATUS` from `app.constants.js`

---

### 5. Forecasts (`new_forecasttables`)

**Schema Key**: `forecasts`  
**Table Name**: `new_forecasttables`  
**Primary Key**: `new_forecasttableid`

**Purpose**: Forecast data for future demand planning. Used by the AutoForecast Azure Function to calculate consumption.

**What it stores**:
- Forecasted quantities by SKU, country, month, year
- Forecast status (approved, pending, etc.)
- Channel information
- System-generated order flags

**Used in Codebase**:
- `src/services/ForecastService.js` - Forecast operations
- `src/services/DataverseDataService.js` - `getForecasts()`, `updateForecast()`
- `src/pages/ForecastsPage.jsx` - Forecast management UI
- `AutoForecast (1)/services/data-fetcher.js` - Azure Function reads forecasts

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_forecasttableid` | Primary key |
| `name` | `new_forecastid` | Forecast identifier |
| `forecastQty` | `new_forecastquantity` | Forecasted quantity |
| `forecastQtyCartons` | `new_forecastquantityincartons` | Forecasted quantity in cartons |
| `forecastStatus` | `new_forecaststatus` | Forecast approval status |
| `month` | `new_month` | Forecast month |
| `year` | `new_year` | Forecast year |
| `monthYear` | `new_monthyear` | Combined month-year 
| `systemGeneratedOrder` | `new_systemgeneratedorder` | Flag indicating system-generated order |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU

**Status Codes**:

**Forecast Status** (`new_forecaststatus`):
| Code | Name |
|------|------|
| 100000000 | Submitted |
| 100000001 | Approved |
| 100000002 | System Forecasted |

**Channel** (`new_channel`):
| Code | Name |
|------|------|
| 100000000 | Private |
| 100000001 | Tender |
| 100000002 | Offers |

**Business Logic**:
- Primary source for consumption calculations in AutoForecast
- If forecast not available, falls back to budget data
- Multiple forecasts per month are summed together
- Latest approved forecast from Forecast Log gets stored as final forecast in Forecast Table
- One forecast per month per country per SKU in the forecast table

---

### 6. Budgets (`new_budgettables`)

**Schema Key**: `budgets`  
**Table Name**: `new_budgettables`  
**Primary Key**: `new_budgettableid`

**Purpose**: Budget data used as fallback when forecasts are not available.
Also used for analysis as in acheivment 

**What it stores**:
- Budgeted quantities by SKU, country, month, year
- Channel information

**Used in Codebase**:
- `AutoForecast (1)/services/data-fetcher.js` - Azure Function reads budgets
- `AutoForecast (1)/services/consumption-service.js` - Budget fallback logic
- `src/services/DataverseDataService.js` - `getBudgets()`

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_budgettableid` | Primary key |
| `name` | `new_budgetid` | Budget identifier |
| `budgetedQty` | `new_budgetedquantity` | Budgeted quantity |
| `budgetedQtyCartons` | `new_budgetedquantityincartons` | Budgeted quantity in cartons |
| `month` | `new_month` | Budget month |
| `year` | `new_year` | Budget year |
| `monthYear` | `new_monthyear` | Combined month-year |
| `channel` | `new_channel` | Channel code |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU

**Status Codes**:

**Channel** (`new_channel`):
| Code | Name |
|------|------|
| 100000000 | Private |
| 100000001 | Tender |
| 100000002 | Offers |

**Business Logic**:
- Used as fallback when forecasts are not available
- Priority: Forecast → Current Year Budget → Previous Year Budget
- Also used for analysis (achievement tracking)

---

### 7. Shipments (`new_shippingtables`)

**Schema Key**: `shipments`  
**Table Name**: `new_shippingtables`  
**Primary Key**: `new_shippingtableid`

**Purpose**: Shipping/shipment records. Tracks shipments from supplier to destination.

**What it stores**:
- Shipment identifiers and numbers
- Delivery dates
- Shipment status
- Destination information

**Used in Codebase**:
- `src/services/ShipmentService.js` - Shipment operations
- `src/services/DataverseDataService.js` - `getShipments()`
- `src/pages/ShipmentsPage.jsx` - Shipment management UI
- `src/components/OrderManagement/` - Links OrderItems to shipments

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_shippingtableid` | Primary key |
| `name` | `new_shipmentid` | Shipment identifier |
| `shipmentNumber` | `new_shipmentnumber` | Shipment number |
| `deliveryDate` | `new_deliverydate` | Expected delivery date |
| `status` | `new_status` | Shipment status (**Note**: Field is `new_status`, not `new_status2`) |
| `month` | `new_month` | Delivery month (Type: Int32) |
| `year` | `new_year` | Delivery year (Type: String, not Int32) |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_Destination@odata.bind` - Links to Destination

**Status Codes**:

**Status** (`new_status` - **Note**: Field is `new_status`, not `new_status2`):
| Code | Name |
|------|------|
| 100000001 | In Transit |
| 100000002 | Delivered |

**Business Logic**:
- OrderItems link to Shipments via `new_ShippingID` lookup
- Status progression: In Transit → Delivered

---

## Configuration Tables

### 8. Allowed Order Months (`new_allowedordermonthses`)

**Schema Key**: `allowedOrderMonths`  
**Table Name**: `new_allowedordermonthses` (with 'es' - matches Azure Function)  
**Primary Key**: `new_allowedordermonthsid`

**Purpose**: Defines which months are allowed for automatic order placement by the AutoForecast Azure Function.

**What it stores**:
- Month numbers (1-12) that are allowed for ordering
- Links to SKU and Country

**Used in Codebase**:
- `AutoForecast (1)/services/data-fetcher.js` - Azure Function reads allowed months
- `AutoForecast (1)/services/stock-simulation-service.js` - Constrains order placement
- `src/services/DataverseDataService.js` - `getAllowedOrderMonths()`

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_allowedordermonthsid` | Primary key |
| `name` | `new_name` | Record name |
| `month` | `new_month` | Month number (1-12) |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU

**Business Logic**:
- AutoForecast only places orders in months listed in this table
- Used to prevent ordering in restricted months

---

### 9. Target Cover Stock (`new_targetcoverstocks`)

**Schema Key**: `targetCoverStock`  
**Table Name**: `new_targetcoverstocks`  
**Primary Key**: `new_targetcoverstockid`

**Purpose**: Configuration for target months of stock cover by SKU and Country.

**What it stores**:
- Number of months to maintain stock cover
- Order frequency settings

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getTargetCoverStock()`
- `AutoForecast (1)/services/stock-simulation-service.js` - Target cover months
- `src/services/StockCoverService.js` - Stock cover calculations

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_targetcoverstockid` | Primary key |
| `name` | `new_name` | Record name |
| `noOfMonths` | `new_noofmonths` | Target number of months cover |
| `orderFrequency` | `new_orderfrequency` | Order frequency setting |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU

---

### 10. Procurement Safe Margin (`new_procurementsafemargins`)

**Schema Key**: `procurementSafeMargin`  
**Table Name**: `new_procurementsafemargins`  
**Primary Key**: `new_procurementsafemarginid`

**Purpose**: Safety margin multiplier for procurement calculations. It is always added to the sales forecast 

**What it stores**:
- Margin percentage/factor
- Links to Country

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getProcurementSafeMargin()`
- `AutoForecast (1)/services/consumption-service.js` - Applies safety margin
- `AutoForecast (1)/index.js` - Passed as `ProcurementSafeMargin` parameter

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_procurementsafemarginid` | Primary key |
| `name` | `new_name` | Record name |
| `margin` | `new_margin` | Safety margin value |

**Lookups**:
- `new_Country@odata.bind` - Links to Country

---

### 11. SKU Country Assignment (`new_skucountryassignments`)

**Schema Key**: `skuCountryAssignments`  
**Table Name**: `new_skucountryassignments`  
**Primary Key**: `new_skucountryassignmentid`

**Purpose**: Defines which SKUs are available/assigned to which countries.

**What it stores**:
- SKU-Country relationships
- In-forecast flag

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getSkuCountryAssignments()`
- Used for filtering available SKUs by country
- Forecast visibility controls

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_skucountryassignmentid` | Primary key |
| `name` | `new_name` | Record name |
| `inForecast` | `new_inforecast` | Flag if included in forecasts |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU

---

## Reporting Tables

### 12. Stock Aging Report (`new_stockagingreporttables`)

**Schema Key**: `stockAgingReports`  
**Table Name**: `new_stockagingreporttables`  
**Primary Key**: `new_stockagingreporttableid`

**Purpose**: Tracks inventory near expiry for write-off calculations.

**What it stores**:
- Batch numbers
- Expiry dates
- Near-expiry quantities
- Warehouse and distributor information

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getStockAgingData()`
- `AutoForecast (1)/services/data-fetcher.js` - Azure Function reads aging data
- `AutoForecast (1)/services/stock-simulation-service.js` - Calculates write-offs

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_stockagingreporttableid` | Primary key |
| `name` | `new_stockagingreportid` | Report identifier |
| `batchNo` | `new_batchno` | Batch number |
| `expiryDate` | `new_expirydate` | Expiry date |
| `nearExpiryQty` | `new_nearexpiryquantity` | Quantity near expiry |
| `monthYear` | `new_monthyear` | Month-year reference |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU
- `new_Distributor@odata.bind` - Links to Distributor
- `new_Warehouse@odata.bind` - Links to Warehouse

**Business Logic**:
- Used to calculate write-offs (stock becomes non-sellable 3 months before expiry)
- Write-offs are distributed across future months in stock simulation

---

### 13. Forecast Log (`new_forecastlogs`)

**Schema Key**: `forecastLogs`  
**Table Name**: `new_forecastlogs`  
**Primary Key**: `new_forecastlogid`

**Purpose**: Audit log of forecast changes and approvals. what ever is latest approved get stored as the final forecast in the forecasttable so we we update the forecast table with approved forecast log , one forecast per month per coutnry per sku in the forecast table

**What it stores**:
- Forecast change history
- Approval status
- Quantities and dates

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getForecastLogs()`, `createForecastLog()`
- Audit trail for forecast changes
- Approval workflow tracking
- Forecast approval workflow (LO → CFO)

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_forecastlogid` | Primary key |
| `name` | `new_name` | Log entry name |
| `date` | `new_date` | Log date |
| `qty` | `new_qty` | Quantity |
| `qtyInCartons` | `new_qtyincartons` | Quantity in cartons |
| `approvalStatus` | `new_approvalstatus` | Approval status |
| `month` | `new_month` | Month |
| `year` | `new_year` | Year |

**Status Codes**:

**Approval Status** (`new_approvalstatus`):
| Code | Name |
|------|------|
| 100000000 | Submitted |
| 100000001 | Approved by LO |
| 100000002 | Approved By CFO |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU

---

### 14. Future Inventory Forecasts (`new_futureinventoryforecasts`)

**Schema Key**: `futureInventoryForecasts`  
**Table Name**: `new_futureinventoryforecasts`  
**Primary Key**: `new_futureinventoryforecastid`

**Purpose**: Stores calculated future inventory projections from the AutoForecast Azure Function. Contains opening stock, closing stock, consumption, write-offs, and months cover calculations.

**What it stores**:
- Future opening and closing stock by date
- Calculated consumption
- At-risk and non-sellable quantities (write-offs)
- Required inventory
- Months cover (pre-calculated)

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getFutureInventory()`, `getFutureInventoryById()`
- `AutoForecast (1)/services/data-writer-service.js` - Writes calculation results
- `AutoForecast (1)/services/data-fetcher.js` - Fetches old data for purging
- `AutoForecast (1)/services/calculation-orchestrator.js` - Orchestrates calculation and writing

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_futureinventoryforecastid` | Primary key |
| `date` | `new_date` | Forecast date |
| `futureOpeningStock` | `new_futureopeningstock` | Opening stock for the period |
| `futureClosingStock` | `new_futureclosingstock` | Closing stock for the period |
| `calculatedConsumption` | `new_calculatedconsumption` | Calculated consumption |
| `atRiskQuantity` | `new_atriskquantity` | Quantity at risk (write-off) |
| `nonSellableQuantity` | `new_nonsellablequantity` | Non-sellable quantity (write-off) |
| `requiredInventory` | `new_requiredinventory` | Required inventory level |
| `coverStock` | `new_coverstock` | Months cover (pre-calculated) |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU

**Filter Fields** (for queries):
- `_new_country_value` - Filter by country GUID (use `countryId` in service calls - automatically mapped)
- `_new_sku_value` - Filter by SKU GUID (use `skuId` in service calls - automatically mapped)

**Business Logic**:
- Written by AutoForecast Azure Function after stock simulation calculations
- Old records are purged before writing new calculations
- One record per SKU per country per date
- Used for reporting and analysis of future inventory levels

**Important Notes**:
- **This is one of only two inventory tables used in the system:**
  - `new_actualinventory` - **Actual inventory** (real data for past/current months) ✅ **USED**
  - `new_futureinventoryforecasts` - **Future inventory forecasts** (calculated/projected data) ✅ **USED**
- **NOT USED**: `new_openingstocktable` - This table exists in Dataverse but is **not used** in our system

---

### 15. Raw Aggregated (`new_rawaggregateds`)

**Schema Key**: `rawAggregated`  
**Table Name**: `new_rawaggregateds` (with 's' - verified from Dataverse API service document)  
**Primary Key**: `new_rawaggregatedid`

**Purpose**: Aggregated raw data for reporting and analysis. Contains actual sales data aggregated by date, channel, and document type.

**What it stores**:
- Aggregated quantities by date, channel, document type
- Stock-out quantities
- Links to SKU, Country, Distributor

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getRawAggregated()`, `getRawAggregatedById()`
- Reporting and analytics dashboards
- Data aggregation for sales analysis

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_rawaggregatedid` | Primary key |
| `name` | `new_name` | Record name |
| `date` | `new_date` | Aggregation date |
| `channel` | `new_channel` | Sales channel (Private, Tender, Offers) |
| `docType` | `new_doctype` | Document type |
| `stockOutQty` | `new_stockoutquantity` | Stock-out quantity |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU
- `new_Distributor@odata.bind` - Links to Distributor

**Filter Fields** (for queries):
- `_new_country_value` - Filter by country GUID (use `countryId` in service calls - automatically mapped)
- `_new_sku_value` - Filter by SKU GUID (use `skuId` in service calls - automatically mapped)
- `_new_distributor_value` - Filter by distributor GUID (use `distributorId` in service calls - automatically mapped)

**Status Codes**:

**Channel** (`new_channel`):
| Code | Name |
|------|------|
| 100000000 | Private |
| 100000001 | Tender |
| 100000002 | Offers |

**Business Logic**:
- Used for actual sales reporting and analysis
- Aggregated from source transaction data
- Can be filtered by country, SKU, distributor, channel, and date range

---

### 16. Labels (`new_labelses`)

**Schema Key**: `labels`  
**Table Name**: `new_labelses` (with 'es' - verified from Dataverse API service document)  
**Primary Key**: `new_labelsid`

**Purpose**: Regulatory labels for order items. Used to track regulatory approval status and requirements for order items.

**What it stores**:
- Label names and identifiers
- Regulatory approval information
- Links to countries and SKUs

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getLabels()`, `getLabelById()`, `createLabel()`, `updateLabel()`, `deleteLabel()`
- `src/services/LabelService.js` - Label management operations
- `src/services/OrderItemService.js` - Links order items to labels for regulatory approval
- `src/components/OrderManagement/` - Label selection and management UI

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_labelsid` | Primary key |
| `name` | `new_label` | Label name/identifier (**Note**: Field is `new_label`, not `new_name`) |
| `labelStatus` | `new_labelstatus` | Label status code |
| `barcode` | `new_barcode` | Barcode for the label |
| `expiryDate` | `new_expirydate` | Expiry date for the label |
| `dateEffective` | `new_dateeffective` | Effective date for the label |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU (labels are also linked to SKUs)

**Filter Fields** (for queries):
- `_new_country_value` - Filter by country GUID (use `countryId` in service calls - automatically mapped)
- `_new_sku_value` - Filter by SKU GUID (use `skuId` in service calls - automatically mapped)

**Business Logic**:
- OrderItems link to Labels via `new_Label` lookup
- Used in regulatory approval workflow
- Labels are country-specific and SKU-specific

---

### 17. Actual Inventory (`new_actualinventorys`)

**Schema Key**: `actualInventory`  
**Table Name**: `new_actualinventories` (with 'ies' - verified from Dataverse API service document)  
**Primary Key**: `new_actualinventoryid`

**Purpose**: **Actual inventory data** - stores real opening stock and closing stock for actual months. This is the source of truth for actual inventory levels in the system.

**What it stores**:
- Actual opening stock quantities for real months
- Actual closing stock quantities for real months
- Inventory dates
- Months cover information
- Links to countries and SKUs

**Used in Codebase**:
- `src/services/DataverseDataService.js` - `getActualInventory()`, `getActualInventoryById()`
- `src/services/StockCoverService.js` - Actual inventory tracking and stock cover calculations
- `src/pages/StockManagementPage.jsx` - Display actual inventory levels
- Stock management and reporting

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_actualinventoryid` | Primary key |
| `inventoryId` | `new_inventoryid` | Inventory identifier |
| `date` | `new_date` | Inventory date (actual month) |
| `openingStock` | `new_openingstock` | **Actual opening stock** for the month (Type: Decimal) |
| `closingStock` | `new_closingstock` | **Actual closing stock** for the month (Type: Decimal) |
| `coverStock` | `new_coverstock` | Months cover (Type: String) |

**Lookups**:
- `new_Country@odata.bind` - Links to Country
- `new_SKU@odata.bind` - Links to SKU

**Filter Fields** (for queries):
- `_new_country_value` - Filter by country GUID (use `countryId` in service calls - automatically mapped)
- `_new_sku_value` - Filter by SKU GUID (use `skuId` in service calls - automatically mapped)

**Business Logic**:
- **This is the actual inventory table** - stores real data for actual months (not forecasts)
- One record per SKU per country per date
- Used as the baseline for stock cover calculations
- Opening stock and closing stock represent actual inventory levels
- Used to track real inventory movements and stock levels

**Important Notes**:
- This table contains **actual/real data** for months that have already occurred
- **This is one of only two inventory tables used in the system:**
  - `new_actualinventory` - **Actual inventory** (real data for past/current months) ✅ **USED**
  - `new_futureinventoryforecasts` - **Future inventory forecasts** (calculated/projected data) ✅ **USED**
- **NOT USED**: `new_openingstocktable` - This table exists in Dataverse but is **not used** in our system

---

### 18. Distributors (`new_distributortables`)

**Schema Key**: `distributors`  
**Table Name**: `new_distributortables`  
**Primary Key**: `new_distributortableid`

**Purpose**: Master data for distributors.

**What it stores**:
- Distributor names and identifiers
- Links to countries

**Used in Codebase**:
- Distributor management
- Reporting by distributor

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_distributortableid` | Primary key |
| `name` | `new_distributorname` | Distributor name |
| `distributorId` | `new_distributorid` | Distributor identifier |

**Lookups**:
- `new_Country@odata.bind` - Links to Country

---

### 19. Doc Type (`new_doctypes`)

**Schema Key**: `docTypes`  
**Table Name**: `new_doctypes`  
**Primary Key**: `new_doctypeid`

**Purpose**: Document type master data for classification.

**What it stores**:
- Document type names
- Invoice types
- Normalized document types

**Used in Codebase**:
- Document classification
- Reporting by document type

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_doctypeid` | Primary key |
| `name` | `new_doctype` | Document type name |
| `invoiceType` | `new_invoicetype` | Invoice type |
| `normalizedDocType` | `new_normalizeddoctype` | Normalized document type |

**Lookups**:
- `new_Country@odata.bind` - Links to Country

---

### 20. Doc Type Calculations (`new_doctypecalculations`)

**Schema Key**: `docTypeCalculations`  
**Table Name**: `new_doctypecalculations`  
**Primary Key**: `new_doctypecalculationsid`

**Purpose**: Calculation rules for document types.

**What it stores**:
- Document type signs and text
- Calculation rules

**Used in Codebase**:
- Calculation logic for document processing

**Key Columns**:
| Friendly Name | Dataverse Column | Description |
|--------------|------------------|-------------|
| `id` | `new_doctypecalculationsid` | Primary key |
| `name` | `new_name` | Record name |
| `docType` | `new_doctype` | Document type |
| `docTypeSign` | `new_doctypesign` | Sign for calculation |
| `docTypeText` | `new_doctypetext` | Text description |

**Lookups**: None

---

## Codebase Mapping

### Service Layer Usage

**Architecture**: All services use `DataverseDataService` as the single point of access to Dataverse. The service uses `dataverse-schema.js` for all table and column mappings.

| Service File | Tables Used | Primary Operations | Uses DataverseDataService |
|-------------|-------------|-------------------|---------------------------|
| `DataverseDataService.js` | All tables | CRUD operations for all tables | ✅ Core service (uses schema) |
| `OrderItemService.js` | `orderItems`, `orders`, `labels` | Order item lifecycle, planning, allocation | ✅ Yes |
| `POService.js` | `orders`, `orderItems` | PO creation, approval workflow | ✅ Yes |
| `ForecastService.js` | `forecasts` | Forecast management | ✅ Yes |
| `ShipmentService.js` | `shipments`, `orderItems` | Shipment tracking | ✅ Yes |
| `AllocationService.js` | `orderItems` | **No separate table** - uses OrderItems | ✅ Yes |
| `StockCoverService.js` | `orderItems`, `forecasts`, `budgets`, `actualInventory` | Stock cover calculations, actual inventory tracking | ✅ Yes |
| `LabelService.js` | `labels` | Label management for regulatory approval | ✅ Yes |

### Component Usage

| Component/Page | Tables Used | Purpose |
|---------------|-------------|---------|
| `OrderManagementPanel.jsx` | `orderItems`, `orders` | Order item management UI |
| `POManagementPage.jsx` | `orders`, `orderItems` | PO management |
| `POApprovalPage.jsx` | `orders`, `orderItems` | PO approval workflow |
| `ForecastsPage.jsx` | `forecasts` | Forecast management |
| `ShipmentsPage.jsx` | `shipments`, `orderItems` | Shipment tracking |
| `StockManagementPage.jsx` | `orderItems`, `forecasts`, `actualInventory` | Stock cover display, actual inventory tracking |

### Azure Function Usage

| Azure Function File | Tables Used | Purpose |
|---------------------|-------------|---------|
| `data-fetcher.js` | `forecasts`, `budgets`, `orderItems`, `allowedOrderMonths`, `stockAgingReports`, `futureInventoryForecasts` | Fetches data for calculations |
| `data-writer-service.js` | `orderItems`, `futureInventoryForecasts` | Writes calculation results |
| `consumption-service.js` | `forecasts`, `budgets` | Consumption calculations |
| `stock-simulation-service.js` | `orderItems`, `stockAgingReports` | Stock simulation |
| `calculation-orchestrator.js` | All above tables | Orchestrates calculation workflow |

---

## Status Codes Reference

> **Note**: Status codes are now documented within each table section above. This section serves as a quick reference.

### Quick Reference

**OrderItems - Order Placement Status**: See [OrderItems table](#4-orderitems-new_orderitems) section above.

**Orders - Order Status**: See [Orders table](#3-orders-new_orders) section above.

**Forecasts - Forecast Status**: See [Forecasts table](#5-forecasts-new_forecasttables) section above.

**SKUs - Disease Area, Category, Status**: See [SKUs table](#2-skus-new_skutables) section above.

**Countries - Currency, Region**: See [Countries table](#1-countries-new_countrytables) section above.

**Shipments - Status**: See [Shipments table](#7-shipments-new_shippingtables) section above.

**Forecast Log - Approval Status**: See [Forecast Log table](#13-forecast-log-new_forecastlogs) section above.

**Channel Codes** (used in multiple tables):
- 100000000 = Private
- 100000001 = Tender
- 100000002 = Offers

---

## Important Notes

### Allocations
- **There is NO separate allocations table**
- Allocations are handled through the **OrderItems table**:
  - `order placemnet staus` field tracks allocation state
  - New OrderItems are created when pushing remaining quantity to different months

### Table Name Variations
- **Important**: Table names in Dataverse API are case-sensitive and may have variations. All table names below are verified from the Dataverse API service document:
  - `new_orderses` (with 'es') - Purchase Orders ✓ Verified from Dataverse API service document
  - `new_orderitemses` (with 'es') - Order Items ✓ Verified from Dataverse API service document
  - `new_allowedordermonthses` (with 'es') - Allowed Order Months ✓ Verified from Dataverse API service document
  - `new_countrytables` (plural) - Countries ✓ Verified from Dataverse API service document
  - `new_skutables` (plural) - SKUs ✓ Verified from Dataverse API service document
  - `new_forecasttables` (plural) - Forecasts ✓ Verified from Dataverse API service document
  - `new_budgettables` (plural) - Budgets ✓ Verified from Dataverse API service document
  - `new_shippingtables` (plural) - Shipments ✓ Verified from Dataverse API service document
  - `new_stockagingreporttables` (plural) - Stock Aging Reports ✓ Verified from Dataverse API service document
  - `new_targetcoverstocks` (plural) - Target Cover Stock ✓ Verified from Dataverse API service document
  - `new_procurementsafemargins` (plural) - Procurement Safe Margin ✓ Verified from Dataverse API service document
  - `new_skucountryassignments` (plural) - SKU Country Assignments ✓ Verified from Dataverse API service document
  - `new_forecastlogs` (plural) - Forecast Logs ✓ Verified from Dataverse API service document
  - `new_futureinventoryforecasts` (plural) - Future Inventory Forecasts ✓ Verified from Dataverse API service document
  - `new_distributortables` (plural) - Distributors ✓ Verified from Dataverse API service document
  - `new_doctypes` (plural) - Document Types ✓ Verified from Dataverse API service document
  - `new_doctypecalculationses` (with 'es') - Document Type Calculations ✓ Verified from Dataverse API service document
  - `new_rawaggregateds` (with 's') - Raw Aggregated ✓ Verified from Dataverse API service document
  - `new_labelses` (with 'es') - Labels ✓ Verified from Dataverse API service document
  - `new_warehousetables` (plural) - Warehouses ✓ Verified from Dataverse API service document
- Always refer to `src/config/dataverse-schema.js` for exact table names
- The schema uses the correct names as verified from the Dataverse API service document (`/api/data/v9.2/`)
- **Browser Cache**: After updating table names, you may need to do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to clear cached JavaScript bundles

### Lookup Fields
- **For reading/filtering**: Use `_new_lookupname_value` (GUID)
  - Example: `_new_country_value eq 'guid-here'`
  - The service automatically maps friendly names like `countryId` to `_new_country_value` in filters
- **For writing/binding**: Use `new_LookupName@odata.bind` format
  - Example: `"new_Country@odata.bind": "/new_countrytables(guid-here)"`

### Primary Keys
- All tables use `new_tablenameid` format for primary keys
- Always use the primary key from `src/config/dataverse-schema.js` for lookups
- The schema provides helper functions: `getPrimaryKey()`, `getTableName()`, `getColumnName()`

---

## Maintenance

**To update this document**:
1. Update `src/config/dataverse-schema.js` with new tables/columns
2. Update `src/config/dataverse-schema.json` (optional, for reference/external tools)
3. Update this mapping document with:
   - New table purposes
   - Codebase usage
   - Column descriptions
4. Add methods to `DataverseDataService.js` if new tables are added
5. Update relevant micro services if needed
6. Update this document's "Last Updated" date

**When adding new tables**:
1. Add table definition to `src/config/dataverse-schema.js`:
   - Table name, primary key
   - Column mappings (friendly → Dataverse names)
   - Lookup relationships
   - Status codes/option sets
   - Default select fields
2. Add corresponding JSON to `src/config/dataverse-schema.json` (optional)
3. Document purpose and usage in this mapping document
4. Add CRUD methods to `DataverseDataService.js`:
   - `get[TableName]()`, `get[TableName]ById()`
   - `create[TableName]()`, `update[TableName]()`, `delete[TableName]()`
5. Update relevant micro services if business logic is needed
6. Test with actual Dataverse API

**Schema Helper Functions** (from `dataverse-schema.js`):
- `getTableSchema(schemaKey)` - Get full schema for a table
- `getTableName(schemaKey)` - Get Dataverse table name
- `getPrimaryKey(schemaKey)` - Get primary key column name
- `getColumnName(schemaKey, friendlyName)` - Map friendly name to Dataverse column
- `getLookupBinding(schemaKey, lookupField, targetId)` - Create OData lookup binding
- `getFilterField(schemaKey, lookupField)` - Get filter field name for lookups

---

**Last Updated**: December 11, 2024  
**Schema Verification**: All table names, column names, and field types verified against:
- Dataverse API Service Document (`/api/data/v9.2/`)
- Dataverse Metadata Document (`/api/data/v9.2/$metadata`)
- Dataverse Entity Definitions (`/api/data/v9.2/EntityDefinitions`)

## Option Sets and Choice Columns

### Global Option Sets vs Local Choice Columns

**Global Option Sets**:
- Shared across multiple tables in Dataverse
- Defined once and reused (e.g., `Channel`, `Currency`)
- Accessed via `/GlobalOptionSetDefinitions` endpoint
- Example: `Channel` option set used by both `Forecasts` and `Budgets` tables

**Local Choice Columns**:
- Specific to a single table
- Defined within the table's entity definition
- Example: `OrderStatus` for `Orders` table, `OrderPlacementStatus` for `OrderItems` table

### How We Handle Option Sets

1. **Schema Configuration** (`dataverse-schema.js`):
   - All option sets (global and local) are defined in the `statusCodes` section of each table
   - Format: `{ fieldName: { numericValue: 'Label', ... } }`
   - Example:
     ```javascript
     statusCodes: {
       currency: {
         1: 'Saudi Riyal (SAR)',
         2: 'Yemeni Rial (YER)',
         // ...
       }
     }
     ```

2. **App Constants** (`app.constants.js`):
   - Business-critical option sets are also defined as constants
   - Used for type safety and business logic
   - Examples: `ORDER_ITEM_STATUS`, `PO_STATUS`, `CHANNEL`, `CURRENCY`

3. **Verification**:
   - Use `src/utils/optionSetVerifier.js` to verify all option sets are properly mapped
   - Run "Option Set Verification" test in Dataverse Test Page
   - Compares Dataverse metadata with our schema and constants

### Option Set Mapping

| Field | Type | Location | Notes |
|-------|------|----------|-------|
| `currency` | Global | `countries.statusCodes.currency` | Also in `app.constants.js` as `CURRENCY` |
| `region` | Local | `countries.statusCodes.region` | Also in `app.constants.js` as `REGION` |
| `channel` | Global | `forecasts.statusCodes.channel`, `budgets.statusCodes.channel` | Also in `app.constants.js` as `CHANNEL` |
| `orderPlacementStatus` | Local | `orderItems.statusCodes.orderPlacementStatus` | Also in `app.constants.js` as `ORDER_ITEM_STATUS` |
| `orderStatus` | Local | `orders.statusCodes.orderStatus` | Also in `app.constants.js` as `PO_STATUS` |
| `forecastStatus` | Local | `forecasts.statusCodes.forecastStatus` | Also in `app.constants.js` as `FORECAST_STATUS` |
| `category` | Local | `skus.statusCodes.category` | Also in `app.constants.js` as `SKU_CATEGORY` |
| `diseaseArea` | Local | `skus.statusCodes.diseaseArea` | Also in `app.constants.js` as `DISEASE_AREA` |

### Verification Process

To ensure all option sets are properly mapped:

1. **Run Option Set Verification**:
   - Go to Dataverse Test Page
   - Click "Test Fetch" on "Option Set Verification"
   - Review the report for any missing or mismatched values

2. **Check for Issues**:
   - Missing values: Option set values in Dataverse not in our schema
   - Extra values: Values in schema not in Dataverse (might be deprecated)
   - Mismatched labels: Same value but different labels

3. **Update Schema/Constants**:
   - If missing values found, add them to `dataverse-schema.js`
   - If business-critical, also add to `app.constants.js`
   - Update `DATAVERSE_SCHEMA_MAPPING.md` documentation

---

**Key Corrections Made**:
- ✅ `new_orderallocationstatus` field does NOT exist - removed from schema (use `new_orderstatus` instead)
- ✅ Labels table uses `new_label` field, not `new_name`
- ✅ Shipments table uses `new_status` field, not `new_status2`
- ✅ OrderItems has both `new_orderplacementstatus` and `new_orderstatus` (separate fields)
- ✅ Shipments `new_year` field is String type, not Int32
- ✅ Labels table has additional fields: `new_labelstatus`, `new_barcode`, `new_expirydate`, `new_dateeffective`
- ✅ Labels table links to both Country and SKU (not just Country)

**Inventory Tables - System Usage**:
- ✅ **USED**: `new_actualinventory` - Actual inventory (real opening/closing stock for actual months)
- ✅ **USED**: `new_futureinventoryforecasts` - Future inventory forecasts (calculated/projected data)
- ❌ **NOT USED**: `new_openingstocktable` - Exists in Dataverse but not used in our system
