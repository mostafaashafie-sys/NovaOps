# StockCalculationService vs StockManagementService - Differences

## Summary

**StockCalculationService** = Pure calculation wrapper (low-level)  
**StockManagementService** = Business logic + data orchestration (high-level)

## 📊 Key Differences

| Aspect | StockCalculationService | StockManagementService |
|--------|----------------------|----------------------|
| **Purpose** | Calculation wrapper | Business logic + data management |
| **Level** | Low-level (calculation only) | High-level (orchestration) |
| **Responsibilities** | Execute measures | Fetch data, structure data, calculate metrics |
| **Dependencies** | CalculationOrchestrator only | DataverseDataService, OrderItemService, StockCalculationService |
| **Data Handling** | None (just calculations) | Fetches, structures, and manages data |
| **Use Cases** | Single/batch measure execution | Complete stock cover workflow |

## 🔍 StockCalculationService

### Purpose
**Pure calculation wrapper** - Provides a clean interface for executing calculation measures.

### Responsibilities
1. ✅ Execute single measures (`executeMeasure()`)
2. ✅ Execute batch measures (`executeBatch()`)
3. ✅ Utility functions (`calculateMonthsCoverFast()`)
4. ✅ Measure catalog access (`getMeasureCatalog()`)

### What It Does
- Wraps CalculationOrchestrator
- Provides simple API for calculations
- Handles calculation errors
- No data fetching or business logic

### Example Usage
```javascript
// Calculate a single measure
const netSales = await StockCalculationService.executeMeasure('netSales', {}, { countryId, skuId, year, month });

// Calculate multiple measures
const results = await StockCalculationService.executeBatch(
  ['netSales', 'closingStock', 'issuesFromStock'],
  {},
  { countryId, skuId, year, month }
);
```

### Architecture
```
StockCalculationService
    ↓ (uses)
CalculationOrchestrator
    ↓ (uses)
CalculationEngine
```

## 🔍 StockManagementService

### Purpose
**Business logic service** - Handles complete stock cover data workflow including data fetching, structuring, and calculations.

### Responsibilities
1. ✅ **Data Fetching** - Fetches forecasts, budgets, order items, inventory, margins
2. ✅ **Data Structuring** - Builds stock cover data structure
3. ✅ **SKU Filtering** - Filters SKUs by country assignments
4. ✅ **Calculation Orchestration** - Calls StockCalculationService for calculations
5. ✅ **Data Management** - Manages stock cover data across months/SKUs
6. ✅ **Order Updates** - Updates planned quantities

### What It Does
- Fetches all required data from Dataverse
- Structures data into stock cover format
- Orchestrates calculations for all SKUs/months
- Manages complete stock cover workflow
- Handles business logic (opening stock, month progression, etc.)

### Example Usage
```javascript
// Get complete stock cover data for a country
const stockCoverData = await StockManagementService.getStockCoverData(
  countryId,
  baseStock,
  calculateMetrics = true,
  cachedSkus
);

// Update planned quantity
await StockManagementService.updatePlannedQty(countryId, skuId, monthKey, newValue);
```

### Architecture
```
StockManagementService
    ├─→ DataverseDataService (data fetching)
    ├─→ OrderItemService (order data)
    └─→ StockCalculationService (calculations)
            ↓
        CalculationOrchestrator
```

## 📋 Detailed Comparison

### StockCalculationService

**Methods:**
- `executeMeasure(measureKey, filters, context)` - Execute single measure
- `executeBatch(measureKeys, filters, context)` - Execute multiple measures
- `calculateMonthsCoverFast(closingStock, futureIssues)` - Utility function
- `getMeasureCatalog()` - Get measure catalog

**Input:**
- Measure keys
- Filters and context
- No data fetching required

**Output:**
- Calculated values (numbers)
- Measure catalog

**Dependencies:**
- CalculationOrchestrator only

### StockManagementService

**Methods:**
- `getStockCoverData(countryId, baseStock, calculateMetrics, skus)` - Main entry point
- `calculateStockCoverWithEngine(stockCoverData, baseStock, margin, countryId)` - Calculate metrics
- `getFilteredSkus(countryId, cachedSkus)` - Filter SKUs by country
- `buildStockCoverStructure(...)` - Build data structure
- `updatePlannedQty(countryId, skuId, monthKey, newValue)` - Update orders
- `calculateMonthsCoverForMonth(...)` - Calculate months cover for specific month
- Helper methods for data processing

**Input:**
- Country ID
- Base stock
- Optional cached SKUs

**Output:**
- Complete stock cover data structure:
  ```javascript
  {
    [skuId]: {
      sku: {...},
      months: {
        [monthKey]: {
          openingStock,
          issuesFromStock,
          closingStock,
          netSales,
          ed,
          budgetAchievement,
          monthsCover,
          inbound,
          ...
        }
      }
    }
  }
  ```

**Dependencies:**
- DataverseDataService (data fetching)
- OrderItemService (order management)
- StockCalculationService (calculations)

## 🎯 When to Use Which

### Use StockCalculationService When:
- ✅ You need to calculate a specific measure
- ✅ You have the context (countryId, skuId, year, month)
- ✅ You don't need data fetching or structuring
- ✅ You're building custom calculation workflows
- ✅ You need batch calculations with dependency optimization

### Use StockManagementService When:
- ✅ You need complete stock cover data for a country
- ✅ You need data fetching and structuring
- ✅ You need the full stock cover workflow
- ✅ You're building UI that displays stock cover
- ✅ You need to update planned quantities

## 📊 Data Flow Comparison

### StockCalculationService Flow
```
Input: measureKey, filters, context
    ↓
CalculationOrchestrator
    ↓
CalculationEngine
    ↓
Schema Measures
    ↓
DataverseDataService (internal)
    ↓
Output: calculated value (number)
```

### StockManagementService Flow
```
Input: countryId
    ↓
Fetch Data (forecasts, budgets, orders, inventory)
    ↓
Filter SKUs by country
    ↓
Build Stock Cover Structure
    ↓
For each SKU/Month:
    ↓
    StockCalculationService.executeBatch()
        ↓
    CalculationOrchestrator
        ↓
    CalculationEngine
    ↓
Output: Complete stock cover data structure
```

## 🔗 Relationship

**StockManagementService USES StockCalculationService**

```
StockManagementService
    └─→ StockCalculationService.executeBatch()
            └─→ CalculationOrchestrator
```

StockManagementService is a **higher-level service** that orchestrates:
1. Data fetching
2. Data structuring
3. **Calculation calls** (via StockCalculationService)
4. Business logic

StockCalculationService is a **lower-level service** that provides:
1. Clean calculation API
2. Batch execution
3. Dependency optimization

## ✅ Summary

| Service | Level | Purpose | Data | Calculations |
|---------|-------|---------|------|--------------|
| **StockCalculationService** | Low | Calculation wrapper | ❌ No | ✅ Yes |
| **StockManagementService** | High | Business logic + orchestration | ✅ Yes | ✅ Yes (via StockCalculationService) |

**Think of it this way:**
- **StockCalculationService** = "Calculate this measure"
- **StockManagementService** = "Get me all stock cover data for this country (fetch data, structure it, calculate everything)"
