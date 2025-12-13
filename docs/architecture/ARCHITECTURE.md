# Architecture Documentation

## Overview

This application follows a **layered architecture** with clear separation between UI, business logic, and data management. The architecture is designed around two core schemas: Dataverse schema (data structure) and Calculation schema (business calculations).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR APPLICATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────┐   ┌──────────────────┐                  │
│   │  dataverse-schema│   │ calculationSchema│                  │
│   │      .js         │   │      .ts         │                  │
│   ├──────────────────┤   ├──────────────────┤                  │
│   │ • Tables         │   │ • Formulas       │                  │
│   │ • Columns        │   │ • Inputs/Outputs │                  │
│   │ • Relationships  │   │ • Thresholds     │                  │
│   │ • Choice values  │   │ • Dependencies   │                  │
│   │                  │   │ • Time Intel.    │                  │
│   └────────┬─────────┘   └────────┬─────────┘                  │
│            │                      │                             │
│            ▼                      ▼                             │
│   ┌──────────────────┐   ┌──────────────────┐                  │
│   │  DataService     │   │ CalculationEngine│                  │
│   ├──────────────────┤   ├──────────────────┤                  │
│   │ • CRUD ops       │   │ • execute()      │                  │
│   │ • Query builder  │   │ • getThreshold() │                  │
│   │ • Field mapping  │   │ • validate()     │                  │
│   │                  │   │ • Time Intel.    │                  │
│   └────────┬─────────┘   └────────┬─────────┘                  │
│            │                      │                             │
│            └──────────┬───────────┘                             │
│                       ▼                                         │
│            ┌──────────────────┐                                 │
│            │   Components     │                                 │
│            │ (StockCover etc) │                                 │
│            └──────────────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
src/
├── components/
│   ├── index.js                # Components barrel export
│   ├── Layout/                 # Layout components
│   │   └── Navigation.jsx
│   ├── UI/                     # Basic reusable UI components
│   │   ├── index.js
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Modal.jsx
│   │   ├── StatusBadge.jsx
│   │   └── ... (12 components)
│   ├── Shared/                 # Page-level shared components
│   │   ├── index.js
│   │   ├── PageHeader.jsx
│   │   ├── LoadingState.jsx
│   │   ├── ErrorState.jsx
│   │   ├── DataTable.jsx
│   │   ├── FilterBar.jsx
│   │   └── OrderPill.jsx
│   ├── OrderManagement/       # Order management feature
│   │   ├── index.js
│   │   ├── OrderManagementPanel.jsx
│   │   ├── components/        # Feature sub-components
│   │   │   ├── index.js
│   │   │   ├── useOrderManagement.js
│   │   │   ├── PanelHeader.jsx
│   │   │   └── UnifiedDetailsTab.jsx
│   │   └── modals/            # Feature modals
│   │       ├── index.js
│   │       ├── StatusModal.jsx
│   │       ├── AllocationModal.jsx
│   │       └── ... (more modals)
│   └── Pages/                 # Page-specific components
│       ├── index.js
│       ├── StockCoverTable.jsx
│       └── modals/
├── hooks/                     # Data fetching hooks
│   ├── index.js
│   ├── useAppData.js
│   ├── useOrders.js
│   ├── useOrderItems.js
│   ├── usePOs.js
│   ├── useForecasts.js
│   ├── useAllocations.js
│   ├── useShipments.js
│   ├── useStockCover.js
│   └── useStockCoverPage.js
├── services/                  # Business logic services
│   ├── index.js
│   ├── DataverseDataService.js
│   ├── CalculationEngine.ts
│   ├── OrderItemService.js
│   ├── POService.js
│   ├── ForecastService.js
│   ├── AllocationService.js
│   ├── ShipmentService.js
│   └── StockCoverService.js
├── providers/                 # React Context providers
│   ├── index.js
│   └── AppProvider.jsx
├── pages/                     # Page components
│   ├── index.js
│   ├── HomePage.jsx
│   ├── StockCoverPage.jsx
│   ├── OrdersPage.jsx
│   ├── ForecastsPage.jsx
│   └── ... (more pages)
├── schema/                    # Schema definitions
│   ├── calculation-schema.ts
│   ├── registry.ts
│   └── measures/              # Measure definitions
├── config/                    # Configuration
│   ├── index.js
│   ├── dataverse-schema.js
│   └── dataverse.config.js
├── utils/                     # Utility functions
│   ├── index.js
│   └── formatters.js
└── main.jsx                   # Entry point
```

## Core Architecture Components

### 1. Dataverse Schema (`dataverse-schema.js`)
**Location:** `src/config/dataverse-schema.js`

**Purpose:** Single source of truth for all Dataverse table and column mappings.

**Contains:**
- ✅ **Tables** - All Dataverse table definitions (e.g., `countries`, `skus`, `rawAggregated`)
- ✅ **Columns** - Field mappings (friendly names → Dataverse logical names)
- ✅ **Relationships** - Lookup relationships between tables
- ✅ **Choice values** - Option set values and status codes
- ✅ **Base URL** - `DATAVERSE_BASE_URL` configuration

**Example:**
```javascript
export const DataverseSchema = {
  countries: {
    tableName: 'new_countrytables',
    primaryKey: 'new_countrytableid',
    columns: { id: 'new_countrytableid', name: 'new_countryname', ... },
    lookups: { sku: 'new_SKU@odata.bind' },
    filterFields: { ... },
    statusCodes: { ... }
  },
  // ... more tables
};
```

### 2. Calculation Schema (`calculation-schema.ts`)
**Location:** `src/schema/calculation-schema.ts`

**Purpose:** Defines calculation measures, formulas, and business rules.

**Contains:**
- ✅ **Formulas** - `CalculationMeasure` with `MeasureComponent[]` (formula structure)
- ✅ **Inputs/Outputs** - `ExecutionContext` and `ExecutionFilters` interfaces
- ✅ **Thresholds** - `MeasureThreshold[]` in `MeasureMetadata`
- ✅ **Dependencies** - Measure references via `ComponentSource.type === 'measure'`
- ✅ **Time Intelligence** - Time-based calculations (SPLY, YTD, rolling averages)

**Example:**
```typescript
export interface CalculationMeasure {
  key: string;
  name: string;
  description?: string;
  components: MeasureComponent[];  // Formula components
  metadata?: {
    thresholds?: MeasureThreshold[];  // Thresholds
    category?: string;
    unit?: string;
  };
}
```

**Measure Definitions:** `src/schema/measures/*.ts`
- `netSales.ts` - Net sales calculation
- `issuesFromStock.ts` - Issues from stock calculation
- `ed.ts` - Expiry & Damage calculation
- `budgetAchievement.ts` - Budget achievement percentage
- ... (50+ measures)

### 3. DataService (`DataverseDataService.js`)
**Location:** `src/services/DataverseDataService.js`

**Purpose:** Handles all Dataverse API operations with schema-aware field mapping.

**Contains:**
- ✅ **CRUD ops** - `create`, `update`, `delete`, `get` methods
- ✅ **Query builder** - `buildFilter`, `buildSelect`, `buildOrderBy` methods
- ✅ **Field mapping** - Uses `dataverse-schema.js` for column name translation

**Key Methods:**
```javascript
class DataverseDataService {
  async getForecasts(filters) { ... }
  async getBudgets(filters) { ... }
  async getRawAggregated(filters) { ... }
  buildFilter(tableKey, filters) { ... }  // Query builder
  // ... more CRUD operations
}
```

### 4. CalculationEngine (`CalculationEngine.ts`)
**Location:** `src/services/CalculationEngine.ts`

**Purpose:** Executes calculation measures with time intelligence support.

**Contains:**
- ✅ **execute()** - `executeMeasure(measureKey, filters, context)` method
- ✅ **getThreshold()** - `getThreshold(measureKey, thresholdKey?)` method
- ✅ **validate()** - `validate(measureKey)` and `validateAll()` methods
- ✅ **Time Intelligence** - SPLY, YTD, rolling averages, forward-looking calculations

**Key Methods:**
```typescript
export class CalculationEngine {
  async executeMeasure(
    measureKey: string,
    filters: ExecutionFilters = {},
    context: ExecutionContext = {}
  ): Promise<number> { ... }

  getThreshold(measureKey: string, thresholdKey?: string): MeasureThreshold | undefined { ... }
  
  getThresholds(measureKey: string): MeasureThreshold[] { ... }
  
  validate(measureKey: string): ValidationResult { ... }
  
  validateAll(): ValidationResult { ... }
}
```

### 5. Components (StockCover, etc.)
**Location:** `src/services/StockCoverService.js`, `src/components/StockManagement/`, etc.

**Uses Both Services:**
- Uses `DataverseDataService` to fetch data
- Uses `CalculationEngine` to execute measures
- Orchestrates business logic combining both

**Example:**
```javascript
class StockCoverService {
  async getStockCoverData(countryId, baseStock, calculateMetrics, skus) {
    // Fetch data using DataService
    const [forecasts, budgets, orderItems, ...] = await Promise.all([
      this.dataverseService.getForecasts({ countryId }),
      this.dataverseService.getBudgets({ countryId }),
      // ...
    ]);
    
    // Execute calculations using CalculationEngine
    const netSales = await calculationEngine.executeMeasure('netSales', {}, {
      countryId,
      skuId,
      year,
      month
    });
    
    // Orchestrate business logic
    // ...
  }
}
```

## Layer Responsibilities

### 1. Services Layer (`src/services/`)

**Purpose**: Pure business logic, no UI dependencies

**Responsibilities**:
- API communication (Dataverse)
- Data transformations
- Business rules and calculations
- Data validation

**Rules**:
- ✅ No React imports
- ✅ No UI components
- ✅ Pure JavaScript functions
- ✅ Easily testable
- ✅ Can be used outside React

### 2. Hooks Layer (`src/hooks/`)

**Purpose**: Bridge between services and UI, manage data state

**Responsibilities**:
- Data fetching
- Loading/error state management
- Caching and optimization
- Provide clean API to components

**Rules**:
- ✅ Use services, never call APIs directly
- ✅ Manage loading/error states
- ✅ Return consistent interface
- ✅ Handle side effects properly

### 3. Providers Layer (`src/providers/`)

**Purpose**: Global state for master data only

**Responsibilities**:
- Provide master data (countries, SKUs, months)
- Global configuration
- Minimal business logic

**Rules**:
- ✅ Only master/reference data
- ✅ No business logic
- ✅ No direct service calls (use hooks)

### 4. Components Layer (`src/components/`)

**Purpose**: Reusable presentational components

**Responsibilities**:
- Display data
- Handle user input
- Emit events
- Styling

**Rules**:
- ✅ No business logic
- ✅ No direct service calls
- ✅ Receive data via props
- ✅ Emit events via callbacks
- ✅ Pure functions when possible

### 5. Pages Layer (`src/pages/`)

**Purpose**: Compose components and handle page-level logic

**Responsibilities**:
- Compose components
- Use hooks for data
- Handle page-level interactions
- Route management

**Rules**:
- ✅ Use hooks, not services directly
- ✅ Compose components
- ✅ Handle user interactions
- ✅ Minimal business logic

## Data Flow

```
┌─────────────┐
│   User      │
│  Action     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Page      │  ← Composes components
│ Component   │  ← Uses hooks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Hook     │  ← Manages state
│  (useOrders)│  ← Calls services
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Service    │  ← Business logic
│ (OrderService)│  ← API calls
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   API/      │
│  Database   │
└─────────────┘
```

## Schema-to-Service Flow

1. **Schema Layer:**
   - `dataverse-schema.js` defines data structure
   - `calculation-schema.ts` defines calculation structure

2. **Service Layer:**
   - `DataverseDataService` reads from Dataverse using schema
   - `CalculationEngine` executes calculations using schema

3. **Component Layer:**
   - Components use both services to orchestrate business logic

## Import Patterns

### ✅ Using Barrel Exports (Recommended)

```javascript
// Import from barrel exports
import { Button, Modal, StatusBadge, PageHeader } from '../components/index.js';
import { useOrders, usePOs } from '../hooks/index.js';
import { OrderService, POService } from '../services/index.js';
import { formatNumber, formatDate } from '../utils/index.js';
import { useApp } from '../providers/index.js';
```

### ❌ Direct Imports (Not Recommended)

```javascript
// Avoid direct imports
import Button from '../components/UI/Button.jsx';
import useOrders from '../hooks/useOrders.js';
import OrderService from '../services/OrderService.js';
```

## Data Model Relationships

### Purchase Order (PO) → Order Items

**Relationship:** One-to-Many
- **PO contains multiple Order Items**
- Each Order Item is linked to a PO via `poId` field

**Structure:**
- **PO** has:
  - `id`: PO identifier (e.g., "PO-2025-001")
  - `orderItemIds`: Array of order item IDs
  - `orderItems`: Array of order item objects (enriched)
  - `countries`: Array of unique countries in this PO
  - `skus`: Array of unique SKUs in this PO
  - `totalQtyCartons`: Sum of all order items

- **Order Item** has:
  - `id`: Order item identifier
  - `poId`: Link to Purchase Order (can be null if not linked)
  - `countryId`, `countryName`: One country per order item
  - `skuId`, `skuName`: One SKU per order item
  - `qtyCartons`: Quantity for this specific SKU+Country combination

### Order Item Structure

**Relationship:** One Order Item = One SKU + One Country

**Key Points:**
- ✅ Each Order Item represents **one SKU** for **one Country**
- ✅ Multiple Order Items can have the same SKU but different countries
- ✅ Multiple Order Items can have the same country but different SKUs
- ✅ Each Order Item is uniquely identified by: SKU + Country + Delivery Month

### Shipment → Order Items + Country

**Relationship:** One-to-Many (with country constraint)
- **Shipment contains multiple Order Items**
- **Shipment is to ONE country** (destination)
- All order items in a shipment should be for the same country

## Usage Examples

### Using CalculationEngine

```typescript
import { calculationEngine } from '@/services/CalculationEngine.js';

// Execute a measure
const result = await calculationEngine.executeMeasure('netSales', {
  countryId: '...',
  skuId: '...'
}, {
  year: 2024,
  month: 1
});

// Get threshold
const threshold = calculationEngine.getThreshold('netSales', 'minValue');
if (result < threshold.value) {
  // Handle below threshold
}

// Validate measure
const validation = calculationEngine.validate('netSales');
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Using DataService with Schema

```javascript
import DataverseDataService from '@/services/DataverseDataService.js';
import { getTableName } from '@/config/dataverse-schema.js';

// Query using schema-aware field names
const forecasts = await DataverseDataService.getForecasts({
  countryId: '...',
  skuId: '...'
});

// Build filter using schema
const filter = DataverseDataService.buildFilter('forecasts', {
  countryId: '...',
  year: 2024
});
```

## Best Practices

### ✅ DO

1. **Services**: Keep pure, testable, no UI dependencies
2. **Hooks**: Manage state, handle loading/errors
3. **Components**: Be presentational, receive props
4. **Pages**: Compose, use hooks, handle interactions

### ❌ DON'T

1. **Services**: Don't import React, don't use hooks
2. **Hooks**: Don't call APIs directly, use services
3. **Components**: Don't call services, don't manage complex state
4. **Pages**: Don't call services directly, use hooks

## Summary

✅ **Architecture is properly aligned:**
- Dataverse schema properly separated
- Calculation schema properly separated
- DataService handles all data operations
- CalculationEngine handles all calculation operations
- Components orchestrate both services
- Time intelligence and validation methods implemented
- Clean separation of concerns and single responsibility principle
