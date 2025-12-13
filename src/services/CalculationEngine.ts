import type {
  CalculationMeasure,
  MeasureComponent,
  ComponentSource,
  FilterCondition,
  FilterLogic,
  AggregationType,
  OperationType,
  ExecutionContext,
  ExecutionFilters,
  MeasureThreshold,
  TimeIntelligence,
  TimeIntelligenceType
} from '@/schema/calculation-schema.js';
import { registry } from '@/schema/registry.js';
import { getTableName, getTableSchema, getColumnName } from '@/config/dataverse-schema.js';
import DataverseDataService from './DataverseDataService.js';
import { Logger } from '@/utils/index.js';
import { validateMeasure, validateAllMeasures, type ValidationResult } from '@/schema/validator.js';

const logger = new Logger('CalculationEngine');

/**
 * Calculation Engine
 * Executes calculation measures from schema definitions
 */
export class CalculationEngine {
  private dataverseService: typeof DataverseDataService;
  private dependencyCache: Map<string, Promise<number>> = new Map();

  constructor() {
    this.dataverseService = DataverseDataService;
  }

  /**
   * Execute a measure
   */
  async executeMeasure(
    measureKey: string,
    filters: ExecutionFilters = {},
    context: ExecutionContext = {},
    visited: Set<string> = new Set()
  ): Promise<number> {
    try {
      // Check for circular dependency FIRST, before doing anything else
      if (visited.has(measureKey)) {
        const visitedArray = Array.from(visited);
        logger.error(`Circular dependency detected in CalculationEngine`, {
          measureKey,
          visitedPath: visitedArray.join(' -> '),
          fullPath: `${visitedArray.join(' -> ')} -> ${measureKey}`
        });
        throw new Error(`Circular dependency detected: ${measureKey} (visited: ${visitedArray.join(' -> ')} -> ${measureKey})`);
      }
      
      // Create new visited set with current measure
      const newVisited = new Set(visited);
      newVisited.add(measureKey);
      
      logger.debug(`Executing measure (visited: ${Array.from(newVisited).join(' -> ')})`, { measureKey });
      
      const measure = registry.get(measureKey);
      if (!measure) {
        throw new Error(`Measure "${measureKey}" not found`);
      }

      logger.debug(`Executing measure via CalculationEngine`, { 
        measureKey,
        hasFilters: Object.keys(filters).length > 0,
        context: { countryId: context.countryId, skuId: context.skuId, year: context.year, month: context.month }
      });

      // Handle special measures that require custom calculation
      if (measureKey === 'monthsCover') {
        const closingStock = await this.executeMeasure('closingStock', filters, context, newVisited);
        return await this.calculateMonthsCover(closingStock, context, filters);
      }

      // Handle date lookup measures
      if (measure.metadata?.calculationType === 'dateLookup') {
        const dateResult = await this.executeDateLookupMeasure(measureKey, filters, context);
        // For now, return 0 for date measures (they need special return type)
        // In future, could extend to return Date objects
        return dateResult ? new Date(dateResult).getTime() : 0;
      }

      // Apply measure-level time intelligence if specified
      let measureContext = context;
      if (measure.timeIntelligence) {
        const timeContext = this.applyTimeIntelligence(measure.timeIntelligence, context);
        measureContext = { ...context, ...timeContext };
      }

      // Resolve dependencies first
      const dependencies = await this.resolveDependencies(measureKey, filters, measureContext, newVisited);

      // Execute components in sort order
      const sortedComponents = [...measure.components].sort((a, b) => a.sortOrder - b.sortOrder);
      
      let result = 0;
      const componentResults: number[] = [];

      for (let i = 0; i < sortedComponents.length; i++) {
        const component = sortedComponents[i];
        let componentValue = await this.executeComponent(component, filters, measureContext, dependencies, newVisited);

        componentResults.push(componentValue);

        // Apply operation
        if (i === 0) {
          result = componentValue;
        } else {
          const operation = component.operation || 'add';
          
          // Special handling for issuesFromStock: if stockMovement is null/0, use selectedMeasure * margin
          if (measureKey === 'issuesFromStock' && operation === 'multiply' && i === 1) {
            // First component (stockMovement) is null/0, so multiply second (selectedMeasure) by margin
            if ((result === 0 || result === null || isNaN(result)) && componentValue !== 0) {
              const margin = await this.executeMeasure('procurementSafeMargin', filters, measureContext, newVisited);
              result = componentValue * (margin || 1.0);
            } else {
              // stockMovement has value, use it
              result = result;
            }
          }
          // Special handling for percentage calculations
          else if (measure.metadata?.unit === 'Percentage' && operation === 'divide') {
            const baseline = componentValue;
            if (baseline !== 0 && !isNaN(baseline) && isFinite(baseline)) {
              // Check if this is a growth measure (subtract first) or ratio measure (direct division)
              const isGrowthMeasure = measure.metadata?.category === 'Growth' || 
                                      measure.name?.toLowerCase().includes('growth');
              
              if (isGrowthMeasure) {
                // For growth: (current - baseline) / baseline
                result = (result - baseline) / baseline;
              } else {
                // For ratio percentages (budgetAchievement, forecastAdherence): current / baseline
                result = result / baseline;
              }
            } else {
              result = 0;
            }
          } else {
            result = this.applyOperation(result, componentValue, operation);
          }
        }
      }

      logger.debug(`Measure calculated successfully`, { 
        measureKey, 
        result,
        componentCount: measure.components.length,
        hasTimeIntelligence: !!measure.timeIntelligence
      });
      return result;
    } catch (error) {
      logger.error(`Failed to execute measure via CalculationEngine`, { 
        measureKey,
        error: error.message,
        stack: error.stack,
        context: { countryId: context.countryId, skuId: context.skuId, year: context.year, month: context.month }
      });
      throw error;
    }
  }

  /**
   * Execute a measure component
   */
  async executeComponent(
    component: MeasureComponent,
    filters: ExecutionFilters,
    context: ExecutionContext,
    dependencies: Record<string, number>,
    visited: Set<string> = new Set()
  ): Promise<number> {
    try {
      // Handle conditional source type
      if (component.source.type === 'conditional' && component.conditionalConfig) {
        return await this.executeConditionalComponent(component, filters, context, dependencies, visited);
      }

      // Handle measure source
      if (component.source.type === 'measure' && component.source.measureKey) {
        const measureKey = component.source.measureKey;
        if (dependencies[measureKey] !== undefined) {
          return dependencies[measureKey];
        }
        return await this.executeMeasure(measureKey, filters, context, visited);
      }

      // Handle table source
      if (component.source.type === 'table' && component.source.tableKey) {
        return await this.executeTableComponent(component, filters, context);
      }

      throw new Error(`Invalid component source type: ${component.source.type}`);
    } catch (error) {
      logger.error(`Failed to execute component via CalculationEngine`, {
        componentId: component.id,
        componentName: component.name,
        sourceType: component.source.type,
        measureKey: component.source.measureKey || component.source.tableKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a conditional component
   */
  private async executeConditionalComponent(
    component: MeasureComponent,
    filters: ExecutionFilters,
    context: ExecutionContext,
    dependencies: Record<string, number>,
    visited: Set<string> = new Set()
  ): Promise<number> {
    if (!component.conditionalConfig) {
      throw new Error('Conditional component must have conditionalConfig');
    }

    const { conditions, primarySource, fallbackSource } = component.conditionalConfig;

    // Evaluate conditions
    const conditionsMatch = this.evaluateConditions(conditions, context);

    // Choose source based on conditions
    const sourceToUse = conditionsMatch ? primarySource : fallbackSource;

    // Create a temporary component with the chosen source
    const tempComponent: MeasureComponent = {
      ...component,
      source: sourceToUse
    };

    return await this.executeComponent(tempComponent, filters, context, dependencies, visited);
  }

  /**
   * Evaluate conditional conditions
   */
  private evaluateConditions(
    conditions: {
      hasData?: boolean;
      isPastMonth?: boolean;
      isFutureMonth?: boolean;
      isCurrentMonth?: boolean;
    },
    context: ExecutionContext
  ): boolean {
    // Check hasData - would need to query data to verify
    if (conditions.hasData !== undefined) {
      // This would require checking if data exists - simplified for now
      // In real implementation, would check if records exist
    }

    // Check month conditions
    if (conditions.isPastMonth !== undefined || 
        conditions.isFutureMonth !== undefined || 
        conditions.isCurrentMonth !== undefined) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const contextYear = context.year || currentYear;
      const contextMonth = context.month || currentMonth;

      if (conditions.isPastMonth) {
        if (contextYear < currentYear || 
            (contextYear === currentYear && contextMonth < currentMonth)) {
          return true;
        }
      }

      if (conditions.isFutureMonth) {
        if (contextYear > currentYear || 
            (contextYear === currentYear && contextMonth > currentMonth)) {
          return true;
        }
      }

      if (conditions.isCurrentMonth) {
        if (contextYear === currentYear && contextMonth === currentMonth) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Execute a table component
   */
  private async executeTableComponent(
    component: MeasureComponent,
    filters: ExecutionFilters,
    context: ExecutionContext
  ): Promise<number> {
    if (!component.source.tableKey) {
      throw new Error('Table component must have tableKey');
    }

    // Apply time intelligence if specified
    const timeContext = this.applyTimeIntelligence(
      component.timeIntelligence || context.timeIntelligence,
      context
    );

    // If no time intelligence but we have year/month, create a date range for the full month
    // This ensures we get all records in that month/year
    // EXCEPTIONS: targetCoverStock and procurementSafeMargin don't have date - they're per country/SKU or country only
    const tablesWithoutDate = ['targetCoverStock', 'procurementSafeMargin'];
    let monthDateRange = timeContext.dateRange;
    if (!monthDateRange && context.year && context.month && !tablesWithoutDate.includes(component.source.tableKey)) {
      const year = context.year;
      const month = context.month;
      // First day of the month
      const startDate = new Date(year, month - 1, 1);
      // First day of the next month (exclusive)
      const endDate = new Date(year, month, 1);
      
      monthDateRange = {
        start: startDate.toISOString().split('T')[0], // YYYY-MM-DD format (e.g., 2025-01-01)
        end: endDate.toISOString().split('T')[0] // YYYY-MM-DD format (e.g., 2025-02-01)
      };
    }

    // Build filters - exclude year/month/date/monthKey from context as they're only used for date range calculation or application logic
    const { year, month, date, monthKey, ...contextWithoutDateFields } = context;
    
    // EXCEPTION: procurementSafeMargin is per-country only, exclude skuId
    let contextForFilters = contextWithoutDateFields;
    if (component.source.tableKey === 'procurementSafeMargin') {
      const { skuId, ...rest } = contextWithoutDateFields;
      contextForFilters = rest;
    }
    
    const allFilters = { 
      ...filters, 
      ...contextForFilters, 
      ...timeContext,
      // Add month date range if we created one
      ...(monthDateRange ? { dateRange: monthDateRange } : {})
    };

    // Fetch data
    const tableName = getTableName(component.source.tableKey);
    const filterQuery = await this.buildFilterQuery(component.source.tableKey, allFilters, component);
    const queryString = filterQuery ? `?${filterQuery}` : '';
    const data = await this.dataverseService.fetch(`/${tableName}${queryString}`);

    const records = data.value || [];

    // Transform response to use friendly column names (matching DataverseSchema)
    const transformedRecords = this.transformRecords(component.source.tableKey, records);

    // Apply time intelligence date filtering if needed
    let timeFilteredData = transformedRecords;
    if (component.timeIntelligence || context.timeIntelligence) {
      timeFilteredData = this.applyTimeIntelligenceFilter(
        transformedRecords,
        component.timeIntelligence || context.timeIntelligence,
        context
      );
    }

    // Apply component filters (now using friendly names)
    let filteredData = timeFilteredData;
    if (component.filters) {
      filteredData = await this.applyFilters(timeFilteredData, component.filters);
    }

    // Apply aggregation
    const columnName = component.source.fieldName || component.source.quantityField || 'quantity';
    const aggregationType = component.aggregation || 'sum';

    return this.applyAggregation(filteredData, aggregationType, columnName);
  }

  /**
   * Resolve all measure dependencies
   */
  async resolveDependencies(
    measureKey: string,
    filters: ExecutionFilters,
    context: ExecutionContext,
    visited: Set<string> = new Set()
  ): Promise<Record<string, number>> {
    const resolved: Record<string, number> = {};
    const resolving = new Set<string>();

    const resolve = async (key: string): Promise<number> => {
      if (resolved[key] !== undefined) {
        return resolved[key];
      }

      if (resolving.has(key)) {
        logger.error(`Circular dependency detected in resolveDependencies`, {
          key,
          resolving: Array.from(resolving),
          visited: Array.from(visited)
        });
        throw new Error(`Circular dependency detected: ${key}`);
      }

      resolving.add(key);

      try {
        // Check cache
        const cacheKey = `${key}:${JSON.stringify(filters)}:${JSON.stringify(context)}`;
        if (this.dependencyCache.has(cacheKey)) {
          const cached = await this.dependencyCache.get(cacheKey)!;
          resolved[key] = cached;
          return cached;
        }

        logger.debug(`Resolving dependency (resolving: ${Array.from(resolving).join(', ')}, visited: ${Array.from(visited).join(', ')})`, { key });
        const value = await this.executeMeasure(key, filters, context, visited);
        resolved[key] = value;

        // Cache result
        const promise = Promise.resolve(value);
        this.dependencyCache.set(cacheKey, promise);

        return value;
      } finally {
        resolving.delete(key);
      }
    };

    const measure = registry.get(measureKey);
    if (!measure) {
      return resolved;
    }

    // Collect ONLY direct dependencies (not transitive) to avoid deep recursion
    // Transitive dependencies will be resolved lazily when needed
    const directDependencies = new Set<string>();
    for (const component of measure.components) {
      if (component.source.type === 'measure' && component.source.measureKey) {
        directDependencies.add(component.source.measureKey);
      }
    }

    logger.debug(`Collected direct dependencies for ${measureKey}`, {
      measureKey,
      dependencyCount: directDependencies.size,
      dependencies: Array.from(directDependencies)
    });

    // Resolve only direct dependencies (lazy resolution will handle transitive deps)
    for (const depKey of directDependencies) {
      await resolve(depKey);
    }

    return resolved;
  }

  /**
   * Apply operation between two values
   */
  private applyOperation(result: number, componentValue: number, operation: OperationType): number {
    switch (operation) {
      case 'add':
        return result + componentValue;
      
      case 'subtract':
        return result - componentValue;
      
      case 'multiply':
        return result * componentValue;
      
      case 'divide':
        return componentValue !== 0 ? result / componentValue : 0;
      
      case 'fallback':
        // Use first valid (non-zero, non-null) value, fallback to second
        if (result !== 0 && result !== null && !isNaN(result) && isFinite(result)) {
          return result;
        }
        return componentValue;
      
      case 'sum':
      default:
        return result + componentValue;
    }
  }

  /**
   * Apply aggregation function to data
   */
  applyAggregation(data: any[], aggregationType: AggregationType, column: string): number {
    if (!data || data.length === 0) {
      return 0;
    }

    const values = data
      .map(record => {
        const value = record[column];
        return value !== null && value !== undefined ? Number(value) : 0;
      })
      .filter(v => !isNaN(v) && isFinite(v));

    switch (aggregationType) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      
      case 'count':
        return data.length;
      
      case 'countDistinct':
        return new Set(values).size;
      
      case 'average':
      case 'avg':
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      
      case 'min':
        return values.length > 0 ? Math.min(...values) : 0;
      
      case 'max':
        return values.length > 0 ? Math.max(...values) : 0;
      
      default:
        logger.warn(`Unknown aggregation type: ${aggregationType}, defaulting to sum`);
        return values.reduce((sum, val) => sum + val, 0);
    }
  }

  /**
   * Apply filter logic to data
   */
  async applyFilters(data: any[], filterLogic: FilterLogic): Promise<any[]> {
    if (!filterLogic || !filterLogic.conditions || filterLogic.conditions.length === 0) {
      return data;
    }

    const logic = filterLogic.logic || 'AND';
    const conditions = filterLogic.conditions;

    const filteredResults = [];
    for (const record of data) {
      const results = await Promise.all(
        conditions.map(condition => this.evaluateCondition(record, condition))
      );

      const shouldInclude = logic === 'OR' 
        ? results.some(r => r)
        : results.every(r => r);
      
      if (shouldInclude) {
        filteredResults.push(record);
      }
    }

    return filteredResults;
  }

  /**
   * Evaluate a single filter condition
   */
  private async evaluateCondition(record: any, condition: FilterCondition): Promise<boolean> {
    const { column, operator, value, values } = condition;
    let recordValue = record[column];

    // For docType, convert to numeric value for comparison (ONLY numeric comparisons)
    if (column === 'docType') {
      try {
        // Import dynamically to avoid circular dependencies
        const { getDocTypeNumericValue } = await import('@/utils/docTypeMapper.js');
        
        // Convert filter value to numeric if it's a string
        let filterNumericValue: number | null = null;
        if (typeof value === 'string') {
          filterNumericValue = await getDocTypeNumericValue(value);
        } else if (typeof value === 'number') {
          filterNumericValue = value;
        }
        
        // Record value should already be numeric from Dataverse, but handle string case
        const recordNumericValue = typeof recordValue === 'number' 
          ? recordValue 
          : (typeof recordValue === 'string' ? await getDocTypeNumericValue(recordValue) : null);
        
        // If we couldn't convert, log warning and return false (don't match)
        if (filterNumericValue === null || recordNumericValue === null) {
          logger.warn(`Could not convert docType to numeric value for comparison`, { 
            filterValue: value, 
            recordValue,
            filterNumeric: filterNumericValue,
            recordNumeric: recordNumericValue,
            operator
          });
          // Return false - don't match if we can't convert to numeric
          return false;
        }
        
        // Use numeric values for comparison (ONLY numeric operators supported)
        const recordNumeric = recordNumericValue;
        const filterNumeric = filterNumericValue;
        
        switch (operator) {
          case 'equals':
            return recordNumeric === filterNumeric;
          case 'notEquals':
            return recordNumeric !== filterNumeric;
          case 'in':
            if (Array.isArray(values)) {
              const numericValues = await Promise.all(
                values.map(v => typeof v === 'string' ? getDocTypeNumericValue(v) : (typeof v === 'number' ? v : null))
              );
              const validNumericValues = numericValues.filter(v => v !== null) as number[];
              return validNumericValues.includes(recordNumeric);
            }
            return false;
          case 'notIn':
            if (Array.isArray(values)) {
              const numericValues = await Promise.all(
                values.map(v => typeof v === 'string' ? getDocTypeNumericValue(v) : (typeof v === 'number' ? v : null))
              );
              const validNumericValues = numericValues.filter(v => v !== null) as number[];
              return !validNumericValues.includes(recordNumeric);
            }
            return true;
          case 'greaterThan':
          case 'greaterThanOrEqual':
          case 'lessThan':
          case 'lessThanOrEqual':
            // Numeric comparison operators
            return this.compareNumeric(recordNumeric, filterNumeric, operator);
          default:
            // For unsupported operators (contains, startsWith, endsWith), log warning and return false
            logger.warn(`Unsupported operator "${operator}" for docType. Only numeric comparisons are supported.`, {
              operator,
              filterValue: value,
              recordValue
            });
            return false;
        }
      } catch (error) {
        logger.error(`Error evaluating docType condition`, {
          column,
          operator,
          value,
          recordValue,
          error: error instanceof Error ? error.message : String(error)
        });
        // Return false on error - don't match if we can't evaluate
        return false;
      }
    }

    // Non-docType filtering
    switch (operator) {
      case 'equals':
        // For channel and similar text fields, use case-insensitive comparison
        if (column === 'channel') {
          return String(recordValue || '').toLowerCase().trim() === String(value || '').toLowerCase().trim();
        }
        return recordValue === value;
      
      case 'notEquals':
        return recordValue !== value;
      
      case 'greaterThan':
        return Number(recordValue) > Number(value);
      
      case 'greaterThanOrEqual':
        return Number(recordValue) >= Number(value);
      
      case 'lessThan':
        return Number(recordValue) < Number(value);
      
      case 'lessThanOrEqual':
        return Number(recordValue) <= Number(value);
      
      case 'contains':
        return String(recordValue || '').toLowerCase().includes(String(value || '').toLowerCase());
      
      case 'startsWith':
        return String(recordValue || '').toLowerCase().startsWith(String(value || '').toLowerCase());
      
      case 'endsWith':
        return String(recordValue || '').toLowerCase().endsWith(String(value || '').toLowerCase());
      
      case 'in':
        return Array.isArray(values) && values.includes(recordValue);
      
      case 'notIn':
        return Array.isArray(values) && !values.includes(recordValue);
      
      case 'isNull':
        return recordValue === null || recordValue === undefined;
      
      case 'isNotNull':
        return recordValue !== null && recordValue !== undefined;
      
      default:
        logger.warn(`Unknown operator: ${operator}`);
        return true;
    }
  }

  /**
   * Compare numeric values with various operators
   */
  private compareNumeric(recordValue: number, filterValue: number, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return recordValue === filterValue;
      case 'notEquals':
        return recordValue !== filterValue;
      case 'greaterThan':
        return recordValue > filterValue;
      case 'greaterThanOrEqual':
        return recordValue >= filterValue;
      case 'lessThan':
        return recordValue < filterValue;
      case 'lessThanOrEqual':
        return recordValue <= filterValue;
      default:
        return recordValue === filterValue;
    }
  }

  /**
   * Transform Dataverse records to use friendly column names
   */
  private transformRecords(tableKey: string, records: any[]): any[] {
    const schema = getTableSchema(tableKey);
    
    // Create reverse mapping (dataverse name -> friendly name)
    const reverseMap: Record<string, string> = {};
    for (const [friendly, dataverse] of Object.entries(schema.columns)) {
      reverseMap[dataverse] = friendly;
    }
    
    return records.map(record => {
      const transformed: any = {};
      for (const [key, value] of Object.entries(record)) {
        const friendlyName = reverseMap[key] || key;
        transformed[friendlyName] = value;
      }
      return transformed;
    });
  }

  /**
   * Build OData filter query string using DataverseDataService's buildFilter
   */
  private async buildFilterQuery(tableKey: string, filters: ExecutionFilters, component?: MeasureComponent): Promise<string> {
    // Extract dateRange, year, month, date, and monthKey if present (don't pass them to buildFilter)
    // These are only used for date range calculation or application logic, not as direct column filters
    const { dateRange, year, month, date, monthKey, ...otherFilters } = filters;

    // Convert docType text values to numeric values for OData queries
    const processedFilters: ExecutionFilters = {};
    for (const [key, value] of Object.entries(otherFilters)) {
      if (key === 'docType' && typeof value === 'string') {
        // Convert docType text to numeric value
        try {
          const { getDocTypeNumericValue } = await import('@/utils/docTypeMapper.js');
          const numericValue = await getDocTypeNumericValue(value);
          if (numericValue !== null) {
            processedFilters[key] = numericValue;
          } else {
            logger.warn(`Could not convert docType "${value}" to numeric value, using as-is`, { value, tableKey });
            processedFilters[key] = value;
          }
        } catch (error) {
          logger.error(`Error converting docType "${value}" to numeric value`, error);
          processedFilters[key] = value; // Fallback to original value
        }
      } else if (key === 'docType' && Array.isArray(value)) {
        // Handle array of docType values (for IN clauses)
        try {
          const { getDocTypeNumericValue } = await import('@/utils/docTypeMapper.js');
          const numericValues = await Promise.all(
            value.map(async (v) => {
              if (typeof v === 'string') {
                const numeric = await getDocTypeNumericValue(v);
                return numeric !== null ? numeric : v;
              }
              return v;
            })
          );
          processedFilters[key] = numericValues;
        } catch (error) {
          logger.error(`Error converting docType array to numeric values`, error);
          processedFilters[key] = value; // Fallback to original value
        }
      } else {
        processedFilters[key] = value;
      }
    }

    // Use DataverseDataService's buildFilter for proper schema mapping
    // buildFilter returns "$filter=..." or empty string, so we need to extract just the expression
    let filterQuery = this.dataverseService.buildFilter(tableKey, processedFilters);
    
    // Extract filter expression (remove $filter= prefix if present)
    let filterExpression = '';
    if (filterQuery) {
      if (filterQuery.startsWith('$filter=')) {
        filterExpression = filterQuery.substring(8); // Remove "$filter=" prefix
      } else {
        filterExpression = filterQuery;
      }
    }
    
    // Add date filtering
    // EXCEPTIONS: targetCoverStock and procurementSafeMargin don't have date - skip date filtering
    const tablesWithoutDate = ['targetCoverStock', 'procurementSafeMargin'];
    if (dateRange && !tablesWithoutDate.includes(tableKey)) {
      const schema = getTableSchema(tableKey);
      // Check if component has custom dateField in timeIntelligence, otherwise use 'date'
      const customDateField = component?.timeIntelligence?.dateField;
      const dateFieldName = customDateField || 'date';
      const dateField = getColumnName(tableKey, dateFieldName) || (customDateField || 'new_date'); // Use schema mapping or custom field
      
      // ALL date ranges use: dateField ge 'start' and dateField lt 'end' (exclusive end)
      // This ensures consistent behavior: >= first day of month, < first day of next month
      const startDate = dateRange.start;
      const endDate = dateRange.end;
      
      // Always use 'ge' (greater than or equal) for start and 'lt' (less than) for end
      const dateFilter = `${dateField} ge '${startDate}' and ${dateField} lt '${endDate}'`;
      filterExpression = filterExpression ? `(${filterExpression}) and ${dateFilter}` : dateFilter;
    }
    
    // Return with $filter= prefix if we have a filter expression
    return filterExpression ? `$filter=${filterExpression}` : '';
  }

  /**
   * Clear dependency cache
   */
  clearCache(): void {
    this.dependencyCache.clear();
  }

  /**
   * Get threshold value for a measure
   * @param measureKey - Measure key
   * @param thresholdKey - Threshold key (optional, returns first if not specified)
   * @returns Threshold value or undefined if not found
   */
  getThreshold(measureKey: string, thresholdKey?: string): MeasureThreshold | undefined {
    const measure = registry.get(measureKey);
    if (!measure || !measure.metadata?.thresholds) {
      return undefined;
    }

    const thresholds = measure.metadata.thresholds;
    if (thresholdKey) {
      return thresholds.find(t => t.key === thresholdKey);
    }
    
    return thresholds.length > 0 ? thresholds[0] : undefined;
  }

  /**
   * Get all thresholds for a measure
   * @param measureKey - Measure key
   * @returns Array of thresholds or empty array
   */
  getThresholds(measureKey: string): MeasureThreshold[] {
    const measure = registry.get(measureKey);
    return measure?.metadata?.thresholds || [];
  }

  /**
   * Validate a measure
   * @param measureKey - Measure key to validate
   * @returns Validation result
   */
  validate(measureKey: string): ValidationResult {
    const measure = registry.get(measureKey);
    if (!measure) {
      return {
        valid: false,
        errors: [{ path: measureKey, message: 'Measure not found' }]
      };
    }
    return validateMeasure(measure);
  }

  /**
   * Validate all measures
   * @returns Validation result for all measures
   */
  validateAll(): ValidationResult {
    return validateAllMeasures(registry.getAllMeasuresMap());
  }

  /**
   * Apply time intelligence to context
   */
  private applyTimeIntelligence(
    timeIntelligence: TimeIntelligence | undefined,
    context: ExecutionContext
  ): ExecutionContext {
    if (!timeIntelligence) {
      return {};
    }

    const dateField = timeIntelligence.dateField || 'date';
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDate = context.date ? new Date(context.date) : now;
    const contextYear = context.year || currentYear;
    const contextMonth = context.month || currentMonth;

    let startDate: Date;
    let endDate: Date;

    switch (timeIntelligence.type) {
      case 'sameperiodlastyear': {
        // Same period last year: first day of month to first day of next month
        startDate = new Date(contextYear - 1, contextMonth - 1, 1);
        endDate = new Date(contextYear - 1, contextMonth, 1); // First day of next month
        break;
      }

      case 'ytd': {
        // Year-to-date: from year start to first day of month after current date
        startDate = new Date(contextYear, 0, 1);
        endDate = new Date(currentDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(1); // First day of next month
        break;
      }

      case 'rolling': {
        // Rolling average: first day of start month to first day of month after current date
        const periods = timeIntelligence.periods || 12;
        startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() - periods);
        startDate.setDate(1); // First day of start month
        endDate = new Date(currentDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(1); // First day of next month
        break;
      }

      case 'forward': {
        // Forward-looking: first day of next month to first day of month after end period
        const periods = timeIntelligence.periods || 12;
        startDate = new Date(currentDate);
        startDate.setMonth(startDate.getMonth() + 1);
        startDate.setDate(1); // First day of next month
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + periods);
        endDate.setDate(1); // First day of month after end period
        break;
      }

      case 'lastyear': {
        // Last year (full year): first day of year to first day of next year
        startDate = new Date(contextYear - 1, 0, 1);
        endDate = new Date(contextYear, 0, 1); // First day of next year
        break;
      }

      case 'pastlastyear': {
        // Past last year (2 years ago): first day of year to first day of next year
        startDate = new Date(contextYear - 2, 0, 1);
        endDate = new Date(contextYear - 1, 0, 1); // First day of next year
        break;
      }

      default:
        return {};
    }

    // Use custom dates if provided
    if (timeIntelligence.startDate) {
      startDate = new Date(timeIntelligence.startDate);
      startDate.setDate(1); // Ensure first day of month
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }
    if (timeIntelligence.endDate) {
      endDate = new Date(timeIntelligence.endDate);
      // Convert to first day of next month
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(1);
      endDate.setHours(0, 0, 0, 0);
    } else {
      // Ensure endDate is first day of next month (already set in switch cases)
      endDate.setHours(0, 0, 0, 0);
    }

    return {
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    };
  }

  /**
   * Apply time intelligence date filtering to records
   */
  private applyTimeIntelligenceFilter(
    records: any[],
    timeIntelligence: TimeIntelligence | undefined,
    context: ExecutionContext
  ): any[] {
    if (!timeIntelligence || !context.dateRange) {
      return records;
    }

    const dateField = timeIntelligence.dateField || 'date';
    const startDate = new Date(context.dateRange.start);
    const endDate = new Date(context.dateRange.end);

    // Use >= start and < end (exclusive end) to match OData query pattern
    return records.filter(record => {
      const recordDate = record[dateField];
      if (!recordDate) return false;

      const date = recordDate instanceof Date ? recordDate : new Date(recordDate);
      return date >= startDate && date < endDate;
    });
  }

  /**
   * Calculate months cover (forward-looking calculation)
   * This is a special calculation that requires custom logic
   */
  async calculateMonthsCover(
    closingStock: number,
    context: ExecutionContext,
    filters: ExecutionFilters = {}
  ): Promise<number> {
    if (closingStock <= 0) {
      return 0;
    }

    // Get future months of issues from stock
    const futureMonths: Array<{ monthKey: string; issues: number }> = [];
    const currentDate = context.date ? new Date(context.date) : new Date();
    
    for (let i = 1; i <= 12; i++) {
      const futureDate = new Date(currentDate);
      futureDate.setMonth(futureDate.getMonth() + i);
      const year = futureDate.getFullYear();
      const month = futureDate.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      // Calculate issues from stock for this future month
      const futureContext: ExecutionContext = {
        ...context,
        year,
        month,
        date: futureDate.toISOString().split('T')[0]
      };

      const issues = await this.executeMeasure('issuesFromStock', filters, futureContext, new Set());
      futureMonths.push({ monthKey, issues });
    }

    // Filter to only months with issues > 0
    const validMonths = futureMonths.filter(m => m.issues > 0);
    
    if (validMonths.length === 0) {
      return 12; // Default to 12 months if no valid issues
    }

    // Calculate cumulative consumption
    let cumulative = 0;
    const cumulativeTable = validMonths.map(month => {
      cumulative += month.issues;
      return {
        ...month,
        cumulativeConsumption: cumulative
      };
    });

    // Find the last month fully covered by closing stock
    let lastFullMonth = null;
    for (let i = 0; i < cumulativeTable.length; i++) {
      if (cumulativeTable[i].cumulativeConsumption <= closingStock) {
        lastFullMonth = i;
      } else {
        break;
      }
    }

    // Calculate months cover
    let monthsCover: number;
    
    if (lastFullMonth === null) {
      // Stock doesn't even cover the first month fully
      const firstMonth = validMonths[0];
      monthsCover = closingStock / firstMonth.issues;
    } else {
      // Stock covers some full months, calculate fraction of next month
      const fullMonths = lastFullMonth + 1;
      const remainingStock = closingStock - cumulativeTable[lastFullMonth].cumulativeConsumption;
      
      if (lastFullMonth + 1 < validMonths.length) {
        const nextMonth = validMonths[lastFullMonth + 1];
        const fractionOfNextMonth = remainingStock / nextMonth.issues;
        monthsCover = fullMonths + Math.min(fractionOfNextMonth, 1);
      } else {
        // No more months, stock covers all - estimate using average
        const totalConsumption = cumulativeTable[lastFullMonth].cumulativeConsumption;
        const avgMonthly = totalConsumption / (lastFullMonth + 1);
        if (avgMonthly > 0) {
          monthsCover = fullMonths + (remainingStock / avgMonthly);
        } else {
          monthsCover = fullMonths;
        }
      }
    }

    return Math.round(monthsCover * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Handle special date lookup measures
   */
  async executeDateLookupMeasure(
    measureKey: string,
    filters: ExecutionFilters,
    context: ExecutionContext
  ): Promise<string | null> {
    const measure = registry.get(measureKey);
    if (!measure) {
      throw new Error(`Measure "${measureKey}" not found`);
    }

    // For lastActualDataDate, find max date where netSales > 0
    if (measureKey === 'lastActualDataDate' || measureKey === 'latestActualEOM') {
      // Get netSales data with date filtering
      const netSalesContext: ExecutionContext = {
        ...context,
        timeIntelligence: {
          type: 'ytd' // Get all data up to now
        }
      };

      // Fetch raw aggregated data to find last date with sales
      const tableName = getTableName('rawAggregated');
      const allFilters = { ...filters, ...context };
      const filterQuery = await this.buildFilterQuery('rawAggregated', allFilters, undefined);
      const queryString = filterQuery ? `?${filterQuery}&$orderby=new_date desc&$top=1000` : '?$orderby=new_date desc&$top=1000';
      
      const data = await this.dataverseService.fetch(`/${tableName}${queryString}`);
      const records = data.value || [];

      // Find first record with non-zero quantity (after filtering for sales)
      for (const record of records) {
        const qty = parseFloat(record.new_name || record.new_stockoutquantity || 0);
        if (qty > 0) {
          const dateStr = record.new_date;
          if (dateStr) {
            return dateStr.split('T')[0]; // Return date part only
          }
        }
      }
    }

    return null;
  }
}

// Export singleton instance
export const calculationEngine = new CalculationEngine();
