/**
 * Calculation Schema
 * TypeScript type definitions for calculation measures, components, and filters
 */

/**
 * Aggregation function types
 */
export type AggregationType = 
  | 'sum' 
  | 'count' 
  | 'countDistinct' 
  | 'average' 
  | 'avg' 
  | 'min' 
  | 'max';

/**
 * Operation types for combining components
 */
export type OperationType = 
  | 'sum'      // Default: sum all components
  | 'add'      // Add component to result
  | 'subtract' // Subtract component from result
  | 'multiply' // Multiply result by component
  | 'divide'   // Divide result by component
  | 'fallback' // Use first valid (non-zero) component, fallback to second
  | 'conditional'; // Conditional logic based on conditions

/**
 * Filter operator types
 */
export type FilterOperator = 
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull';

/**
 * Filter condition definition
 */
export interface FilterCondition {
  id?: string;
  column: string;
  operator: FilterOperator;
  value?: string | number | boolean | null;
  values?: Array<string | number>; // For 'in' and 'notIn' operators
}

/**
 * Filter logic (AND/OR combination of conditions)
 */
export interface FilterLogic {
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
}

/**
 * Conditional configuration for conditional source types
 */
export interface ConditionalConfig {
  conditions: {
    hasData?: boolean;        // Check if data exists
    isPastMonth?: boolean;    // Check if month is in the past
    isFutureMonth?: boolean;  // Check if month is in the future
    isCurrentMonth?: boolean; // Check if month is current
  };
  primarySource: ComponentSource;   // Source to use if conditions match
  fallbackSource: ComponentSource;  // Source to use if conditions don't match
}

/**
 * Component source configuration
 * Can be either a table source or a measure reference
 */
export interface ComponentSource {
  type: 'table' | 'measure' | 'conditional';
  // For table source
  tableKey?: string;          // Dataverse table key (e.g., 'rawAggregated', 'forecasts')
  fieldName?: string;         // Field name to aggregate (e.g., 'quantity', 'forecastQty')
  quantityField?: string;    // Alternative field name for quantity (default: 'quantity')
  // For measure source
  measureKey?: string;        // Reference to another measure
  // For conditional source (uses conditionalConfig)
}

/**
 * Measure component definition
 * Represents a single component of a calculation measure
 */
export interface MeasureComponent {
  id: string;
  name: string;
  source: ComponentSource;
  operation?: OperationType;        // How this component combines with previous
  aggregation?: AggregationType;    // Aggregation function (default: 'sum')
  filters?: FilterLogic;            // Filter conditions
  sortOrder: number;                 // Order of execution
  conditionalConfig?: ConditionalConfig; // For conditional source types
  timeIntelligence?: TimeIntelligence;   // Time intelligence for this component
  metadata?: {
    description?: string;
    [key: string]: any;
  };
}

/**
 * Threshold configuration for measures
 */
export interface MeasureThreshold {
  key: string;
  name: string;
  value: number;
  operator?: 'greaterThan' | 'lessThan' | 'equals' | 'greaterThanOrEqual' | 'lessThanOrEqual';
  description?: string;
}

/**
 * Measure metadata
 */
export interface MeasureMetadata {
  category?: string;
  unit?: string;
  tags?: string[];
  version?: string;
  thresholds?: MeasureThreshold[];
  [key: string]: any;
}

/**
 * Calculation measure definition
 * Top-level structure representing a complete calculation measure
 */
export interface CalculationMeasure {
  key: string;
  name: string;
  description?: string;
  components: MeasureComponent[];
  metadata?: MeasureMetadata;
  timeIntelligence?: TimeIntelligence; // Time intelligence for the entire measure
}

/**
 * Time intelligence types
 */
export type TimeIntelligenceType = 
  | 'sameperiodlastyear'  // Same period last year (SPLY)
  | 'ytd'                  // Year-to-date
  | 'rolling'              // Rolling average (N months)
  | 'forward'              // Forward-looking (N months ahead)
  | 'lastyear'             // Last year (full year)
  | 'pastlastyear';        // Past last year (2 years ago)

/**
 * Time intelligence configuration
 */
export interface TimeIntelligence {
  type: TimeIntelligenceType;
  periods?: number;         // For rolling/forward: number of periods
  dateField?: string;       // Date field to use (default: 'date')
  startDate?: string;       // Custom start date
  endDate?: string;         // Custom end date
}

/**
 * Execution context for measure calculations
 */
export interface ExecutionContext {
  countryId?: string;
  skuId?: string;
  year?: number;
  month?: number;
  date?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  timeIntelligence?: TimeIntelligence;
  [key: string]: any;
}

/**
 * Execution filters
 */
export interface ExecutionFilters {
  [key: string]: string | number | boolean | Array<string | number> | null;
}
