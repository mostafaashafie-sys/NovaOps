/**
 * Option Set Verifier
 * 
 * This utility helps verify that all global option sets and local choice columns
 * from Dataverse are properly reflected in:
 * 1. app.constants.js - For business logic constants
 * 2. dataverse-schema.js - For schema statusCodes mappings
 * 
 * Global Option Sets: Shared across multiple tables (e.g., Channel, Currency)
 * Local Choice Columns: Specific to a single table (e.g., Order Status for Orders table)
 */

import DataverseDataService from '@/services/DataverseDataService.js';
import { DataverseSchema } from '@/config/dataverse-schema.js';
import { AppConstants } from '@/config/app.constants.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('OptionSetVerifier');

/**
 * Fetch all global option sets from Dataverse
 */
export async function fetchGlobalOptionSets() {
  try {
    const dataverseService = DataverseDataService;
    const response = await dataverseService.fetch('/GlobalOptionSetDefinitions');
    return response.value || [];
  } catch (error) {
    logger.error('Failed to fetch global option sets', error);
    throw error;
  }
}

/**
 * Fetch option sets for a specific entity (local choice columns)
 * @returns {Promise<{attributes: Array, found: boolean}>} Object with attributes array and found flag
 */
export async function fetchEntityOptionSets(entityName) {
  try {
    const dataverseService = DataverseDataService;
    const response = await dataverseService.fetch(`/EntityDefinitions(LogicalName='${entityName}')/Attributes`);
    const attributes = response.value || [];
    
    // Filter for choice/picklist attributes
    const filteredAttributes = attributes.filter(attr => 
      attr.AttributeType === 'Picklist' || 
      attr.AttributeType === 'State' ||
      attr.AttributeType === 'Status'
    );
    
    return { attributes: filteredAttributes, found: true };
  } catch (error) {
    // If entity doesn't exist (404), return empty array with found=false
    if (error.message?.includes('404') || error.status === 404) {
      return { attributes: [], found: false };
    }
    logger.error(`Failed to fetch option sets for entity ${entityName}`, error);
    throw error;
  }
}

/**
 * Get option set values from metadata
 */
export function getOptionSetValues(optionSetMetadata) {
  if (!optionSetMetadata || !optionSetMetadata.Options) {
    return {};
  }
  
  const values = {};
  optionSetMetadata.Options.forEach(option => {
    if (option.Value !== null && option.Value !== undefined) {
      values[option.Value] = option.Label?.UserLocalizedLabel?.Label || option.Label || `Value ${option.Value}`;
    }
  });
  
  return values;
}

/**
 * Verify option sets are properly mapped in schema
 */
export function verifySchemaMapping(schemaKey, fieldName, dataverseValues, schemaValues) {
  const missing = [];
  const extra = [];
  const mismatched = [];
  
  // Check for missing values in schema
  for (const [value, label] of Object.entries(dataverseValues)) {
    if (!schemaValues[value]) {
      missing.push({ value, label });
    } else if (schemaValues[value] !== label) {
      mismatched.push({ 
        value, 
        dataverseLabel: label, 
        schemaLabel: schemaValues[value] 
      });
    }
  }
  
  // Check for extra values in schema (not in Dataverse)
  for (const [value, label] of Object.entries(schemaValues)) {
    if (!dataverseValues[value]) {
      extra.push({ value, label });
    }
  }
  
  return {
    matches: Object.keys(dataverseValues).filter(v => 
      schemaValues[v] && schemaValues[v] === dataverseValues[v]
    ).length,
    missing,
    extra,
    mismatched,
    isComplete: missing.length === 0 && mismatched.length === 0
  };
}

/**
 * Verify all option sets for a table
 */
export async function verifyTableOptionSets(schemaKey) {
  const schema = DataverseSchema[schemaKey];
  if (!schema) {
    throw new Error(`Schema key ${schemaKey} not found`);
  }
  
  const results = {
    schemaKey,
    tableName: schema.tableName,
    globalOptionSets: [],
    localChoiceColumns: [],
    issues: []
  };
  
  try {
    // Get entity logical name from table name
    // Dataverse entity logical names for metadata API may differ from OData table names
    // Try multiple variations to find the correct entity name
    const entityNameVariations = [];
    
    // Add explicit mappings for known cases
    // Note: Some entities may not exist in Dataverse metadata API
    // This is normal - not all tables have corresponding entity definitions
    const entityNameMap = {
      'new_labelses': ['new_labelses', 'new_label'], // Try both variations
      'new_actualinventories': ['new_actualinventory', 'new_actualinventories'],
      'new_orderitemses': ['new_orderitems', 'new_orderitem'],
      'new_orderses': ['new_order', 'new_orders'],
      'new_forecasttables': ['new_forecasttable', 'new_forecast'],
      'new_budgettables': ['new_budgettable', 'new_budget'],
      'new_countrytables': ['new_countrytable', 'new_country'],
      'new_skutables': ['new_skutable', 'new_sku'],
      'new_shippingtables': ['new_shippingtable', 'new_shipping'],
      'new_distributortables': ['new_distributortable', 'new_distributor'],
      'new_rawaggregateds': ['new_rawaggregated', 'new_rawaggregateds'], // Try singular
      'new_allowedordermonthses': ['new_allowedordermonth', 'new_allowedordermonths'],
      'new_stockagingreporttables': ['new_stockagingreporttable', 'new_stockagingreport'],
      'new_futureinventoryforecasts': ['new_futureinventoryforecast', 'new_futureinventory'],
      'new_skucountryassignments': ['new_skucountryassignment', 'new_skucountryassignment'],
      'new_targetcoverstocks': ['new_targetcoverstock', 'new_targetcover'],
      'new_procurementsafemargins': ['new_procurementsafemargin', 'new_procurementsafemargin'],
      'new_forecastlogs': ['new_forecastlog', 'new_forecastlog'],
      'new_warehousetables': ['new_warehousetable', 'new_warehouse'],
      'new_doctypes': ['new_doctype', 'new_doctype'],
      'new_doctypecalculationses': ['new_doctypecalculation', 'new_doctypecalculations'],
    };
    
    if (entityNameMap[schema.tableName]) {
      entityNameVariations.push(...entityNameMap[schema.tableName]);
    } else {
      // Generate variations based on table name patterns
      entityNameVariations.push(schema.tableName); // Try table name as-is first
      
      // Handle special plural forms
      if (schema.tableName.endsWith('ies')) {
        // e.g., 'inventories' -> 'inventory'
        entityNameVariations.push(schema.tableName.replace(/ies$/, 'y'));
      } else if (schema.tableName.endsWith('es')) {
        // Try removing 'es'
        entityNameVariations.push(schema.tableName.replace(/es$/, ''));
        // For 'tables' -> 'table'
        if (schema.tableName.endsWith('tables')) {
          entityNameVariations.push(schema.tableName.replace(/tables$/, 'table'));
        }
      } else if (schema.tableName.endsWith('s')) {
        // e.g., 'tables' -> 'table'
        entityNameVariations.push(schema.tableName.replace(/s$/, ''));
      }
    }
    
    // Try each variation until one works (entity found)
    let entityAttributes = [];
    let entityFound = false;
    
    for (const entityName of entityNameVariations) {
      try {
        const result = await fetchEntityOptionSets(entityName);
        if (result.found) {
          // Entity exists, use its attributes
          entityAttributes = result.attributes;
          entityFound = true;
          break;
        }
        // Entity not found, try next variation
      } catch (error) {
        // Non-404 errors should propagate
        logger.error(`Error fetching entity ${entityName} for table ${schema.tableName}`, error);
        throw error;
      }
    }
    
    // If no entity found, log warning but continue with empty attributes
    if (!entityFound) {
      logger.warn(`Could not find entity logical name for table ${schema.tableName}. Tried: ${entityNameVariations.join(', ')}`);
      entityAttributes = []; // Ensure empty array
    }
    
    for (const attr of entityAttributes) {
      const fieldName = attr.LogicalName;
      const friendlyName = Object.keys(schema.columns).find(
        key => schema.columns[key] === fieldName
      ) || fieldName;
      
      // Get option set metadata
      let optionSetMetadata = attr.OptionSet;
      if (!optionSetMetadata && attr.OptionSetName) {
        // Might be a global option set reference
        const globalOptionSets = await fetchGlobalOptionSets();
        optionSetMetadata = globalOptionSets.find(
          os => os.Name === attr.OptionSetName
        );
      }
      
      if (optionSetMetadata) {
        const dataverseValues = getOptionSetValues(optionSetMetadata);
        const schemaValues = schema.statusCodes?.[friendlyName] || schema.statusCodes?.[fieldName] || {};
        
        const verification = verifySchemaMapping(
          schemaKey,
          friendlyName,
          dataverseValues,
          schemaValues
        );
        
        const isGlobal = !!attr.OptionSetName && !attr.OptionSet;
        
        if (isGlobal) {
          results.globalOptionSets.push({
            fieldName: friendlyName,
            dataverseFieldName: fieldName,
            optionSetName: attr.OptionSetName,
            values: dataverseValues,
            schemaValues,
            verification
          });
        } else {
          results.localChoiceColumns.push({
            fieldName: friendlyName,
            dataverseFieldName: fieldName,
            values: dataverseValues,
            schemaValues,
            verification
          });
        }
        
        if (!verification.isComplete) {
          results.issues.push({
            fieldName: friendlyName,
            type: isGlobal ? 'global' : 'local',
            ...verification
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to verify option sets for ${schemaKey}`, error);
    results.error = error.message;
  }
  
  return results;
}

/**
 * Verify constants in app.constants.js match schema
 */
export function verifyConstantsMapping() {
  const results = {
    constants: {},
    issues: []
  };
  
  // Map of constants to schema fields
  const constantMappings = {
    'ORDER_ITEM_STATUS': { schemaKey: 'orderItems', fieldName: 'orderPlacementStatus' },
    'PO_STATUS': { schemaKey: 'orders', fieldName: 'orderStatus' },
    'CHANNEL': { schemaKey: 'forecasts', fieldName: 'channel' },
    'FORECAST_STATUS': { schemaKey: 'forecasts', fieldName: 'forecastStatus' },
    'SHIPMENT_STATUS': { schemaKey: 'shipments', fieldName: 'status' },
    'SKU_CATEGORY': { schemaKey: 'skus', fieldName: 'category' },
    'DISEASE_AREA': { schemaKey: 'skus', fieldName: 'diseaseArea' },
    'REGION': { schemaKey: 'countries', fieldName: 'region' },
    'CURRENCY': { schemaKey: 'countries', fieldName: 'currency' },
  };
  
  for (const [constantName, mapping] of Object.entries(constantMappings)) {
    const constant = AppConstants[constantName];
    const schema = DataverseSchema[mapping.schemaKey];
    const schemaValues = schema?.statusCodes?.[mapping.fieldName] || {};
    
    if (!constant || !constant.NAMES) {
      results.issues.push({
        constant: constantName,
        issue: 'Constant or NAMES not found'
      });
      continue;
    }
    
    const constantValues = constant.NAMES;
    const verification = verifySchemaMapping(
      mapping.schemaKey,
      mapping.fieldName,
      schemaValues,
      constantValues
    );
    
    results.constants[constantName] = {
      schemaKey: mapping.schemaKey,
      fieldName: mapping.fieldName,
      constantValues,
      schemaValues,
      verification
    };
    
    if (!verification.isComplete) {
      results.issues.push({
        constant: constantName,
        ...verification
      });
    }
  }
  
  return results;
}

/**
 * Generate a comprehensive report
 */
export async function generateOptionSetReport() {
  const report = {
    timestamp: new Date().toISOString(),
    globalOptionSets: [],
    tables: {},
    constants: null,
    summary: {
      totalTables: 0,
      tablesWithIssues: 0,
      totalGlobalOptionSets: 0,
      totalLocalChoiceColumns: 0,
      totalIssues: 0
    }
  };
  
  try {
    // Fetch all global option sets
    const globalOptionSets = await fetchGlobalOptionSets();
    report.globalOptionSets = globalOptionSets.map(os => ({
      name: os.Name,
      displayName: os.DisplayName?.UserLocalizedLabel?.Label || os.Name,
      values: getOptionSetValues(os)
    }));
    report.summary.totalGlobalOptionSets = globalOptionSets.length;
    
    // Verify constants
    report.constants = verifyConstantsMapping();
    
    // Verify each table
    const schemaKeys = Object.keys(DataverseSchema);
    report.summary.totalTables = schemaKeys.length;
    
    for (const schemaKey of schemaKeys) {
      try {
        const tableResults = await verifyTableOptionSets(schemaKey);
        report.tables[schemaKey] = tableResults;
        
        // Only count as issue if there are actual verification issues, not just fetch errors
        if (tableResults.error) {
          // Entity not found or fetch error - log but don't count as verification issue
          logger.warn(`Skipping option set verification for ${schemaKey}: ${tableResults.error}`);
        } else if (tableResults.issues && tableResults.issues.length > 0) {
          report.summary.tablesWithIssues++;
        }
        
        if (tableResults.localChoiceColumns) {
          report.summary.totalLocalChoiceColumns += tableResults.localChoiceColumns.length;
        }
        if (tableResults.issues) {
          report.summary.totalIssues += tableResults.issues.length;
        }
      } catch (error) {
        // Log error but continue processing other tables
        logger.warn(`Failed to verify option sets for ${schemaKey}: ${error.message}`);
        report.tables[schemaKey] = { 
          error: error.message,
          skipped: true 
        };
      }
    }
  } catch (error) {
    logger.error('Failed to generate option set report', error);
    report.error = error.message;
  }
  
  return report;
}

export default {
  fetchGlobalOptionSets,
  fetchEntityOptionSets,
  getOptionSetValues,
  verifySchemaMapping,
  verifyTableOptionSets,
  verifyConstantsMapping,
  generateOptionSetReport
};

