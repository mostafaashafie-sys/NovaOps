# Calculation Mappings Table Design

## Table: `new_calculationmappings` (Data API) / `new_calculationmapping` (Metadata API)

**Purpose**: Store dynamic mappings between calculation measures and Dataverse columns/fields. This allows users to configure calculation rules without code changes.

**Primary Key**: `new_calculationmappingid`

## Schema Design

### Columns

| Friendly Name | Dataverse Column | Type | Description |
|--------------|------------------|------|-------------|
| `id` | `new_calculationmappingid` | GUID | Primary key |
| `name` | `new_name` | String | Mapping name/identifier |
| `measureKey` | `new_measurekey` | String | The calculation measure key (e.g., 'issuesFromStock', 'netSales', 'ed') |
| `sourceTable` | `new_sourcetable` | String | Source Dataverse table (e.g., 'rawAggregated', 'forecasts', 'budgets') |
| `fieldName` | `new_fieldname` | String | Field name in the source table (e.g., 'docType', 'quantity', 'forecastQty') |
| `docTypePatterns` | `new_doctypepatterns` | String (JSON) | Comma-separated or JSON array of docType patterns to match |
| `channelPatterns` | `new_channelpatterns` | String (JSON) | Comma-separated or JSON array of channel patterns to match |
| `sign` | `new_sign` | Option Set | Sign for calculation: Positive (1), Negative (-1), Both (0) |
| `quantityField` | `new_quantityfield` | String | Field name containing quantity (e.g., 'quantity', 'qty', 'name') |
| `mappingType` | `new_mappingtype` | Option Set | Type of mapping: DocType (1), Field (2), Pattern (3), Combined (4) |
| `configuration` | `new_configuration` | String (JSON) | Additional configuration as JSON (for complex mappings) |
| `isActive` | `new_isactive` | Boolean | Whether this mapping is active |
| `sortOrder` | `new_sortorder` | Integer | Sort order for multiple mappings of same measure |
| `status` | `statecode` | Option Set | Status: Active (0), Inactive (1) |
| `statusReason` | `statuscode` | Option Set | Status reason |
| `createdOn` | `createdon` | DateTime | Created date |
| `modifiedOn` | `modifiedon` | DateTime | Modified date |

### Lookups

| Friendly Name | Dataverse Column | Target Table | Description |
|--------------|------------------|--------------|-------------|
| `country` | `new_Country@odata.bind` | `new_countrytables` | Optional: Country-specific mapping |
| `sku` | `new_SKU@odata.bind` | `new_skutables` | Optional: SKU-specific mapping |

### Option Sets

#### `new_sign` (Sign)
- `1` = Positive (only count positive values)
- `-1` = Negative (only count negative values)
- `0` = Both (count all values)

#### `new_mappingtype` (Mapping Type)
- `100000000` = DocType (match by document type)
- `100000001` = Field (direct field mapping)
- `100000002` = Pattern (pattern matching)
- `100000003` = Combined (docType + channel + other conditions)

## Usage Examples

### Example 1: Net Sales Mapping
```json
{
  "measureKey": "netSales",
  "sourceTable": "rawAggregated",
  "fieldName": "docType",
  "docTypePatterns": "sales,invoice,delivery,returns,return,credit note",
  "quantityField": "quantity",
  "mappingType": "DocType",
  "sign": "Both"
}
```

### Example 2: FOC Products to POS
```json
{
  "measureKey": "issuesFromStock",
  "subMeasure": "focProductsToPOS",
  "sourceTable": "rawAggregated",
  "fieldName": "docType",
  "docTypePatterns": "foc,free of charge,free",
  "channelPatterns": "pos,point of sale",
  "quantityField": "quantity",
  "mappingType": "Combined",
  "sign": "Positive"
}
```

### Example 3: E&D (Expiry)
```json
{
  "measureKey": "ed",
  "subMeasure": "expiry",
  "sourceTable": "rawAggregated",
  "fieldName": "docType",
  "docTypePatterns": "expiry,expired,expiration",
  "quantityField": "quantity",
  "mappingType": "DocType",
  "sign": "Positive"
}
```

## Implementation Notes

1. **Multiple Mappings per Measure**: A single measure (e.g., `issuesFromStock`) can have multiple mappings that are combined
2. **Sub-Measures**: Use `subMeasure` in configuration JSON for nested measures (e.g., `focProductsToPOS` under `issuesFromStock`)
3. **Country/SKU Specific**: Optional lookups allow country or SKU-specific mappings
4. **Sort Order**: When multiple mappings exist, use `sortOrder` to determine processing order
5. **Active Flag**: Use `isActive` to temporarily disable mappings without deleting

## Service Methods Needed

- `getCalculationMappings(filters)` - Get mappings with optional filters (measureKey, countryId, skuId)
- `getCalculationMappingById(id)` - Get single mapping
- `createCalculationMapping(data)` - Create new mapping
- `updateCalculationMapping(id, data)` - Update existing mapping
- `deleteCalculationMapping(id)` - Delete mapping (or set inactive)

## Migration from Config File

1. Create the table in Dataverse
2. Migrate existing mappings from `stockCalculationMappings.js` to Dataverse records
3. Update `StockCalculationService` to fetch from Dataverse instead of config file
4. Update `StockCalculationConfigPage` to save to Dataverse
