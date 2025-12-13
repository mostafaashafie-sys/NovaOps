# Missing Columns Analysis for Calculation Mappings

## Current Issues

### 1. **Measure-Level Metadata Missing**
Currently, measure metadata (name, description) is stored in component mappings, which is not ideal:
- **Measure Name**: Stored in first mapping's `name` field (workaround)
- **Measure Description**: Not stored at all - only in UI state
- **Measure-level metadata**: No dedicated table or fields

### 2. **Data Stored in JSON Configuration**
These should be dedicated columns for better querying and filtering:
- `sourceType` (table vs measure) - Currently in `configuration` JSON
- `operation` (add, subtract, multiply, divide) - Currently in `configuration` JSON  
- `filterColumn` - Currently in `configuration` JSON

### 3. **Component-Specific Fields**
- `componentIndex` - Not explicitly stored (derived from sortOrder)
- `componentName` - Mixed with measure name in `name` field

## Recommended New Columns

### Option 1: Add to Existing Table (Simpler)

| Column Name | Dataverse Column | Type | Description |
|-------------|------------------|------|-------------|
| `measureName` | `new_measurename` | String (250) | Display name of the measure (e.g., "Sales", "Net Sales") |
| `measureDescription` | `new_measuredescription` | String (2000) | Description of what the measure calculates |
| `sourceType` | `new_sourcetype` | Option Set | Source type: Table (1), Measure (2) |
| `operation` | `new_operation` | Option Set | Operation: Sum (1), Add (2), Subtract (3), Multiply (4), Divide (5) |
| `filterColumn` | `new_filtercolumn` | String (100) | Column name used for filtering (e.g., "docType", "channel") |
| `componentIndex` | `new_componentindex` | Integer | Explicit component index within the measure (0-based) |
| `isMeasureComponent` | `new_ismeasurecomponent` | Boolean | True if this is a component of a measure (vs standalone mapping) |

### Option 2: Separate Measures Table (Better Architecture)

Create a new table `new_calculationmeasures`:

| Column Name | Dataverse Column | Type | Description |
|-------------|------------------|------|-------------|
| `id` | `new_calculationmeasureid` | GUID | Primary key |
| `measureKey` | `new_measurekey` | String (100) | Unique identifier (e.g., "sales", "netSales") |
| `name` | `new_name` | String (250) | Display name (e.g., "Sales", "Net Sales") |
| `description` | `new_description` | String (2000) | Description of the measure |
| `category` | `new_category` | Option Set | Category: Revenue (1), Cost (2), Inventory (3), Other (4) |
| `unit` | `new_unit` | String (50) | Unit of measurement (e.g., "USD", "Qty", "Days") |
| `isActive` | `new_isactive` | Boolean | Whether the measure is active |
| `createdOn` | `createdon` | DateTime | Created date |
| `modifiedOn` | `modifiedon` | DateTime | Modified date |

Then add a lookup in `new_calculationmappings`:
- `measure` | `new_measure@odata.bind` | `new_calculationmeasures` | Lookup to measure table

## Recommended Changes (Priority Order)

### High Priority (Immediate Impact)

1. **`measureName`** - `new_measurename` (String 250)
   - **Why**: Currently using workaround in `name` field
   - **Impact**: Proper measure name storage and display

2. **`sourceType`** - `new_sourcetype` (Option Set)
   - **Why**: Currently in JSON, needed for filtering/querying
   - **Impact**: Better queries, clearer data model
   - **Values**: Table (100000000), Measure (100000001)

3. **`operation`** - `new_operation` (Option Set)
   - **Why**: Currently in JSON, needed for formula building
   - **Impact**: Better formula generation, clearer operations
   - **Values**: Sum (100000000), Add (100000001), Subtract (100000002), Multiply (100000003), Divide (100000004)

### Medium Priority (Better UX)

4. **`measureDescription`** - `new_measuredescription` (String 2000)
   - **Why**: Currently not stored, lost on page refresh
   - **Impact**: Users can document what measures do

5. **`filterColumn`** - `new_filtercolumn` (String 100)
   - **Why**: Currently in JSON, needed for filtering logic
   - **Impact**: Better filter management

### Low Priority (Nice to Have)

6. **`componentIndex`** - `new_componentindex` (Integer)
   - **Why**: Currently derived from sortOrder
   - **Impact**: Explicit component ordering

7. **Separate Measures Table** - `new_calculationmeasures`
   - **Why**: Better normalization, measure-level metadata
   - **Impact**: Cleaner architecture, better scalability

## Migration Path

1. **Phase 1**: Add high-priority columns to existing table
2. **Phase 2**: Migrate data from JSON configuration to new columns
3. **Phase 3**: Update code to use new columns instead of JSON
4. **Phase 4** (Optional): Create separate measures table and migrate

## Current JSON Configuration Usage

The `configuration` field currently stores:
```json
{
  "sourceType": "table" | "measure",
  "operation": "sum" | "add" | "subtract" | "multiply" | "divide",
  "filterColumn": "docType" | "channel" | etc.,
  "aggregationType": "sum" | "count" | etc.,
  "subMeasure": "optional sub-measure key"
}
```

After adding dedicated columns, `configuration` can be simplified to only store:
```json
{
  "subMeasure": "optional sub-measure key",
  "customSettings": { /* any other custom settings */ }
}
```
