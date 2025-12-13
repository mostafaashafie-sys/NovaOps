/**
 * OData Query Parser
 * Parses OData queries to extract field names, filters, and table information
 */

import { getTableSchema, getColumnName } from '@/config/dataverse-schema.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('QueryParser');

/**
 * Parse OData query to extract information
 * @param {string} query - OData query string (e.g., "$filter=field eq 'value'")
 * @param {string} tableKey - Schema key for the table
 * @returns {Object} Parsed query information
 */
export function parseODataQuery(query, tableKey) {
  try {
    const result = {
      filters: [],
      fieldNames: [],
      tableKey,
      rawQuery: query
    };

    if (!query) return result;

    // Remove $filter= prefix if present
    let filterExpression = query;
    if (filterExpression.startsWith('$filter=')) {
      filterExpression = filterExpression.substring(8);
    }

    // Extract table name from full query URL if present
    const urlMatch = query.match(/\/([^?]+)\?/);
    if (urlMatch) {
      result.tableName = urlMatch[1];
    }

    // Parse filter conditions
    // Handle AND/OR logic - simple approach: split by ' and ' or ' or ' at top level
    const parseFilterExpression = (expr) => {
      const parts = [];
      
      // Simple splitting - handle nested parentheses by tracking depth
      let depth = 0;
      let current = '';
      let i = 0;
      
      while (i < expr.length) {
        const char = expr[i];
        if (char === '(') {
          depth++;
          current += char;
        } else if (char === ')') {
          depth--;
          current += char;
        } else if (depth === 0) {
          // Check for ' and ' or ' or ' at top level
          if (expr.substr(i, 5) === ' and ') {
            if (current.trim()) {
              parts.push({ type: 'AND', expr: current.trim() });
            }
            current = '';
            i += 4; // Skip ' and '
          } else if (expr.substr(i, 4) === ' or ') {
            if (current.trim()) {
              parts.push({ type: 'OR', expr: current.trim() });
            }
            current = '';
            i += 3; // Skip ' or '
          } else {
            current += char;
          }
        } else {
          current += char;
        }
        i++;
      }
      
      if (current.trim()) {
        parts.push({ type: 'AND', expr: current.trim() });
      }
      
      return parts;
    };

    const filterParts = parseFilterExpression(filterExpression);
    
    for (const part of filterParts) {
      const condition = parseFilterCondition(part.expr, tableKey);
      if (condition) {
        result.filters.push({
          ...condition,
          logic: part.type
        });
      }
    }

    return result;
  } catch (error) {
    logger.error('Failed to parse OData query', { query, error: error.message });
    return { filters: [], fieldNames: [], tableKey, rawQuery: query, error: error.message };
  }
}

/**
 * Parse a single filter condition
 * @param {string} condition - Filter condition string (e.g., "field eq 'value'")
 * @param {string} tableKey - Schema key
 * @returns {Object|null} Parsed condition
 */
function parseFilterCondition(condition, tableKey) {
  try {
    // Remove outer parentheses
    condition = condition.trim().replace(/^\(|\)$/g, '');
    
    // Match operators: eq, ne, gt, ge, lt, le, contains, startswith, endswith
    const operatorMatch = condition.match(/\s+(eq|ne|gt|ge|lt|le|contains|startswith|endswith|in)\s+/i);
    if (!operatorMatch) return null;
    
    const operator = operatorMatch[1].toLowerCase();
    const operatorIndex = condition.indexOf(operatorMatch[0]);
    
    const fieldName = condition.substring(0, operatorIndex).trim();
    let valueStr = condition.substring(operatorIndex + operatorMatch[0].length).trim();
    
    // Remove outer parentheses from value if present
    valueStr = valueStr.replace(/^\(|\)$/g, '');
    
    // Parse value
    let value = valueStr;
    if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
      value = valueStr.slice(1, -1).replace(/''/g, "'"); // Unescape single quotes
    } else if (!isNaN(valueStr) && valueStr !== '') {
      value = Number(valueStr);
    } else if (valueStr === 'true' || valueStr === 'false') {
      value = valueStr === 'true';
    }
    
    // Try to map field name back to friendly name
    const schema = getTableSchema(tableKey);
    let friendlyName = fieldName;
    if (schema && schema.columns) {
      // Reverse lookup: find friendly name from Dataverse column name
      for (const [friendly, dataverse] of Object.entries(schema.columns)) {
        if (dataverse === fieldName) {
          friendlyName = friendly;
          break;
        }
      }
    }
    
    return {
      column: friendlyName,
      dataverseColumn: fieldName,
      operator,
      value,
      raw: condition
    };
  } catch (error) {
    logger.warn('Failed to parse filter condition', { condition, error: error.message });
    return null;
  }
}

/**
 * Extract field names from select clause
 * @param {string} query - OData query
 * @returns {string[]} Field names
 */
export function extractSelectFields(query) {
  const selectMatch = query.match(/\$select=([^&]+)/);
  if (!selectMatch) return [];
  
  return selectMatch[1].split(',').map(f => f.trim());
}

/**
 * Generate updated measure component code
 * @param {Object} component - Original component definition
 * @param {Object} parsedQuery - Parsed query information
 * @returns {string} Updated TypeScript code
 */
export function generateUpdatedComponentCode(component, parsedQuery) {
  // Generate updated component code
  let code = `    {
      id: '${component.id}',
      name: '${component.name}',
      source: {
        type: 'table',
        tableKey: '${component.source.tableKey}',
        fieldName: '${component.source.fieldName || component.source.quantityField}',
        quantityField: '${component.source.quantityField || component.source.fieldName}'
      }`;
  
  // Add filters if we have parsed filters
  if (parsedQuery.filters && parsedQuery.filters.length > 0) {
    // Determine logic (AND if all are AND, OR if any is OR)
    const hasOr = parsedQuery.filters.some(f => f.logic === 'OR');
    const logic = hasOr ? 'OR' : 'AND';
    
    const conditions = parsedQuery.filters.map(f => {
      let valueStr;
      if (typeof f.value === 'string') {
        valueStr = `'${f.value.replace(/'/g, "\\'")}'`;
      } else if (Array.isArray(f.value)) {
        valueStr = `[${f.value.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')}]`;
      } else {
        valueStr = f.value;
      }
      
      // Map operator back to measure format
      const operatorMap = {
        'equals': 'equals',
        'notEquals': 'notEquals',
        'greaterThan': 'greaterThan',
        'greaterThanOrEqual': 'greaterThanOrEqual',
        'lessThan': 'lessThan',
        'lessThanOrEqual': 'lessThanOrEqual',
        'contains': 'contains',
        'startsWith': 'startsWith',
        'endsWith': 'endsWith',
        'in': 'in'
      };
      
      const operator = operatorMap[f.operator] || f.operator;
      
      return `          {
            column: '${f.column}',
            operator: '${operator}',
            value: ${valueStr}
          }`;
    });
    
    code += `,
      filters: {
        logic: '${logic}',
        conditions: [
${conditions.join(',\n')}
        ]
      }`;
  } else if (component.filters) {
    // Keep original filters if no new ones parsed
    const conditions = component.filters.conditions.map(c => {
      let valueStr;
      if (typeof c.value === 'string') {
        valueStr = `'${c.value.replace(/'/g, "\\'")}'`;
      } else if (Array.isArray(c.value)) {
        valueStr = `[${c.value.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')}]`;
      } else {
        valueStr = c.value;
      }
      
      return `          {
            column: '${c.column}',
            operator: '${c.operator}',
            value: ${valueStr}
          }`;
    });
    
    code += `,
      filters: {
        logic: '${component.filters.logic || 'AND'}',
        conditions: [
${conditions.join(',\n')}
        ]
      }`;
  }
  
  // Add other component properties
  if (component.aggregation) {
    code += `,
      aggregation: '${component.aggregation}'`;
  }
  
  if (component.sortOrder !== undefined) {
    code += `,
      sortOrder: ${component.sortOrder}`;
  }
  
  if (component.operation) {
    code += `,
      operation: '${component.operation}'`;
  }
  
  if (component.timeIntelligence) {
    code += `,
      timeIntelligence: ${JSON.stringify(component.timeIntelligence, null, 10).split('\n').map((line, i) => i === 0 ? line : '      ' + line).join('\n')}`;
  }
  
  code += `
    }`;
  
  return code;
}
