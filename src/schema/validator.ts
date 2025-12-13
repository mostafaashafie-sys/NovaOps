import type { 
  CalculationMeasure, 
  MeasureComponent, 
  ComponentSource, 
  FilterCondition,
  FilterLogic 
} from './calculation-schema.js';

/**
 * Validation error
 */
export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a calculation measure
 */
export function validateMeasure(measure: CalculationMeasure): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate top-level structure
  if (!measure.key || typeof measure.key !== 'string') {
    errors.push({ path: 'key', message: 'Measure key is required and must be a string' });
  }

  if (!measure.name || typeof measure.name !== 'string') {
    errors.push({ path: 'name', message: 'Measure name is required and must be a string' });
  }

  if (!measure.components || !Array.isArray(measure.components)) {
    errors.push({ path: 'components', message: 'Measure must have an array of components' });
    return { valid: false, errors };
  }

  if (measure.components.length === 0) {
    errors.push({ path: 'components', message: 'Measure must have at least one component' });
  }

  // Validate each component
  measure.components.forEach((component, index) => {
    const componentPath = `components[${index}]`;
    const componentErrors = validateComponent(component, componentPath);
    errors.push(...componentErrors);
  });

  // Check for duplicate component IDs
  const componentIds = measure.components.map(c => c.id).filter(Boolean);
  const duplicateIds = componentIds.filter((id, index) => componentIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push({
      path: 'components',
      message: `Duplicate component IDs found: ${duplicateIds.join(', ')}`
    });
  }

  // Check sort order uniqueness
  const sortOrders = measure.components.map(c => c.sortOrder);
  const duplicateSortOrders = sortOrders.filter((order, index) => sortOrders.indexOf(order) !== index);
  if (duplicateSortOrders.length > 0) {
    errors.push({
      path: 'components',
      message: `Duplicate sort orders found: ${duplicateSortOrders.join(', ')}`
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a measure component
 */
export function validateComponent(component: MeasureComponent, path: string = 'component'): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!component.id || typeof component.id !== 'string') {
    errors.push({ path: `${path}.id`, message: 'Component ID is required and must be a string' });
  }

  if (!component.name || typeof component.name !== 'string') {
    errors.push({ path: `${path}.name`, message: 'Component name is required and must be a string' });
  }

  if (typeof component.sortOrder !== 'number') {
    errors.push({ path: `${path}.sortOrder`, message: 'Component sortOrder is required and must be a number' });
  }

  // Validate source
  if (!component.source) {
    errors.push({ path: `${path}.source`, message: 'Component source is required' });
  } else {
    const sourceErrors = validateSource(component.source, `${path}.source`);
    errors.push(...sourceErrors);
  }

  // Validate filters if present
  if (component.filters) {
    const filterErrors = validateFilterLogic(component.filters, `${path}.filters`);
    errors.push(...filterErrors);
  }

  // Validate conditional config if present
  if (component.conditionalConfig) {
    const conditionalErrors = validateConditionalConfig(component.conditionalConfig, `${path}.conditionalConfig`);
    errors.push(...conditionalErrors);
  }

  return errors;
}

/**
 * Validate a component source
 */
export function validateSource(source: ComponentSource, path: string = 'source'): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!source.type || !['table', 'measure', 'conditional'].includes(source.type)) {
    errors.push({
      path,
      message: 'Source type must be one of: table, measure, conditional'
    });
  }

  if (source.type === 'table') {
    if (!source.tableKey || typeof source.tableKey !== 'string') {
      errors.push({ path: `${path}.tableKey`, message: 'Table source must have a tableKey' });
    }
  } else if (source.type === 'measure') {
    if (!source.measureKey || typeof source.measureKey !== 'string') {
      errors.push({ path: `${path}.measureKey`, message: 'Measure source must have a measureKey' });
    }
  } else if (source.type === 'conditional') {
    // Conditional sources are validated in validateConditionalConfig
  }

  return errors;
}

/**
 * Validate filter logic
 */
export function validateFilterLogic(filterLogic: FilterLogic, path: string = 'filters'): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!filterLogic.logic || !['AND', 'OR'].includes(filterLogic.logic)) {
    errors.push({ path: `${path}.logic`, message: 'Filter logic must be AND or OR' });
  }

  if (!filterLogic.conditions || !Array.isArray(filterLogic.conditions)) {
    errors.push({ path: `${path}.conditions`, message: 'Filter conditions must be an array' });
    return errors;
  }

  if (filterLogic.conditions.length === 0) {
    errors.push({ path: `${path}.conditions`, message: 'Filter must have at least one condition' });
  }

  filterLogic.conditions.forEach((condition, index) => {
    const conditionErrors = validateFilterCondition(condition, `${path}.conditions[${index}]`);
    errors.push(...conditionErrors);
  });

  return errors;
}

/**
 * Validate a filter condition
 */
export function validateFilterCondition(condition: FilterCondition, path: string = 'condition'): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!condition.column || typeof condition.column !== 'string') {
    errors.push({ path: `${path}.column`, message: 'Condition column is required and must be a string' });
  }

  const validOperators = [
    'equals', 'notEquals', 'greaterThan', 'greaterThanOrEqual',
    'lessThan', 'lessThanOrEqual', 'contains', 'startsWith', 'endsWith',
    'in', 'notIn', 'isNull', 'isNotNull'
  ];

  if (!condition.operator || !validOperators.includes(condition.operator)) {
    errors.push({
      path: `${path}.operator`,
      message: `Condition operator must be one of: ${validOperators.join(', ')}`
    });
  }

  // Validate value/values based on operator
  if (condition.operator === 'in' || condition.operator === 'notIn') {
    if (!condition.values || !Array.isArray(condition.values) || condition.values.length === 0) {
      errors.push({
        path: `${path}.values`,
        message: 'Operator "in" or "notIn" requires a non-empty values array'
      });
    }
  } else if (condition.operator !== 'isNull' && condition.operator !== 'isNotNull') {
    if (condition.value === undefined || condition.value === null) {
      errors.push({
        path: `${path}.value`,
        message: `Operator "${condition.operator}" requires a value`
      });
    }
  }

  return errors;
}

/**
 * Validate conditional configuration
 */
export function validateConditionalConfig(
  config: { conditions: any; primarySource: ComponentSource; fallbackSource: ComponentSource },
  path: string = 'conditionalConfig'
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config.conditions || typeof config.conditions !== 'object') {
    errors.push({ path: `${path}.conditions`, message: 'Conditional config must have conditions object' });
  }

  if (!config.primarySource) {
    errors.push({ path: `${path}.primarySource`, message: 'Conditional config must have primarySource' });
  } else {
    const primaryErrors = validateSource(config.primarySource, `${path}.primarySource`);
    errors.push(...primaryErrors);
  }

  if (!config.fallbackSource) {
    errors.push({ path: `${path}.fallbackSource`, message: 'Conditional config must have fallbackSource' });
  } else {
    const fallbackErrors = validateSource(config.fallbackSource, `${path}.fallbackSource`);
    errors.push(...fallbackErrors);
  }

  return errors;
}

/**
 * Detect circular dependencies in measures
 */
export function detectCircularDependencies(
  measures: Record<string, CalculationMeasure>,
  measureKey: string
): string[] | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycle: string[] = [];

  function visit(key: string): boolean {
    if (recursionStack.has(key)) {
      cycle.push(key);
      return true; // Cycle detected
    }

    if (visited.has(key)) {
      return false; // Already processed
    }

    visited.add(key);
    recursionStack.add(key);

    const measure = measures[key];
    if (!measure) {
      recursionStack.delete(key);
      return false;
    }

    // Check all components for measure dependencies
    for (const component of measure.components) {
      if (component.source.type === 'measure' && component.source.measureKey) {
        const depKey = component.source.measureKey;
        if (visit(depKey)) {
          if (cycle.length === 0 || cycle[0] !== key) {
            cycle.unshift(key);
          }
          recursionStack.delete(key);
          return true;
        }
      }
    }

    recursionStack.delete(key);
    return false;
  }

  if (visit(measureKey)) {
    return cycle;
  }

  return null;
}

/**
 * Validate all measures and check for circular dependencies
 */
export function validateAllMeasures(measures: Record<string, CalculationMeasure>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate each measure
  for (const [key, measure] of Object.entries(measures)) {
    const result = validateMeasure(measure);
    if (!result.valid) {
      errors.push(...result.errors.map(e => ({
        path: `${key}.${e.path}`,
        message: e.message
      })));
    }

    // Check for circular dependencies
    const cycle = detectCircularDependencies(measures, key);
    if (cycle) {
      errors.push({
        path: key,
        message: `Circular dependency detected: ${cycle.join(' -> ')}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
