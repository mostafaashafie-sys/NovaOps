/**
 * Schema Discovery Service
 * Discovers Dataverse schema from EntityDefinitions API
 * Compares with current schema and provides update capabilities
 */

import DataverseDataService from './DataverseDataService.js';
import { DataverseSchema, getTableSchema, getTableName } from '@/config/dataverse-schema.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('SchemaDiscoveryService');

class SchemaDiscoveryService {
  constructor() {
    this.discoveredSchema = null;
    this.discoveryCache = null;
    this.cacheTimeout = 1000 * 60 * 60; // 1 hour
    this.cacheTime = null;
  }

  /**
   * Discover all tables from Dataverse
   * @returns {Promise<Array>} Array of table definitions
   */
  async discoverAllTables() {
    try {
      logger.info('Discovering all tables from Dataverse...');
      
      const response = await DataverseDataService.fetch('/EntityDefinitions?$select=LogicalName,EntitySetName,DisplayName,SchemaName');
      const entities = response.value || [];
      
      // Filter to only custom tables (starting with 'new_')
      const customTables = entities
        .filter(entity => entity.LogicalName?.startsWith('new_'))
        .map(entity => ({
          logicalName: entity.LogicalName,
          entitySetName: entity.EntitySetName,
          displayName: entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName,
          schemaName: entity.SchemaName
        }));
      
      logger.info(`Discovered ${customTables.length} custom tables`);
      return customTables;
    } catch (error) {
      logger.error('Failed to discover tables', error);
      throw error;
    }
  }

  /**
   * Discover all columns/attributes for a table
   * @param {string} logicalName - Entity logical name
   * @returns {Promise<Array>} Array of column definitions
   */
  async discoverTableColumns(logicalName) {
    try {
      logger.debug(`Discovering columns for table: ${logicalName}`);
      
      // Fetch without $select - OptionSetName is not a selectable property
      const response = await DataverseDataService.fetch(
        `/EntityDefinitions(LogicalName='${logicalName}')/Attributes`
      );
      
      const attributes = response.value || [];
      
      const columns = attributes
        .filter(attr => {
          // Exclude system fields
          const systemFields = ['createdon', 'modifiedon', 'createdby', 'modifiedby', 'ownerid', 'statecode', 'statuscode', 'versionnumber', 'importsequencenumber', 'overriddencreatedon', 'timezoneruleversionnumber', 'utcconversiontimezonecode'];
          return !systemFields.includes(attr.LogicalName?.toLowerCase());
        })
        .map(attr => {
          // Determine if it's an option set based on AttributeType only
          // OptionSetName is not available in Attributes response
          const isOptionSet = attr.AttributeType === 'Picklist' || 
                              attr.AttributeType === 'State' || 
                              attr.AttributeType === 'Status';
          return {
            logicalName: attr.LogicalName,
            displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
            type: attr.AttributeType,
            isNullable: attr.IsNullable,
            isOptionSet,
            optionSetName: undefined, // OptionSetName not available in Attributes response
            targets: attr.Targets || [] // For lookup fields
          };
        });
      
      logger.debug(`Discovered ${columns.length} columns for ${logicalName}`);
      return columns;
    } catch (error) {
      logger.error(`Failed to discover columns for ${logicalName}`, error);
      throw error;
    }
  }

  /**
   * Discover lookup relationships for a table
   * @param {string} logicalName - Entity logical name
   * @returns {Promise<Array>} Array of lookup relationships
   */
  async discoverLookups(logicalName) {
    try {
      logger.debug(`Discovering lookups for table: ${logicalName}`);
      
      const [oneToMany, manyToOne] = await Promise.all([
        DataverseDataService.fetch(
          `/EntityDefinitions(LogicalName='${logicalName}')/OneToManyRelationships?$select=ReferencingAttribute,ReferencingEntity,ReferencingEntityNavigationPropertyName`
        ).catch(() => ({ value: [] })),
        DataverseDataService.fetch(
          `/EntityDefinitions(LogicalName='${logicalName}')/ManyToOneRelationships?$select=ReferencedAttribute,ReferencedEntity,ReferencedEntityNavigationPropertyName`
        ).catch(() => ({ value: [] }))
      ]);
      
      const lookups = [];
      
      // OneToMany: This table is referenced by others
      (oneToMany.value || []).forEach(rel => {
        lookups.push({
          type: 'oneToMany',
          referencingEntity: rel.ReferencingEntity,
          referencingAttribute: rel.ReferencingAttribute,
          navigationProperty: rel.ReferencingEntityNavigationPropertyName
        });
      });
      
      // ManyToOne: This table references others
      (manyToOne.value || []).forEach(rel => {
        lookups.push({
          type: 'manyToOne',
          referencedEntity: rel.ReferencedEntity,
          referencedAttribute: rel.ReferencedAttribute,
          navigationProperty: rel.ReferencedEntityNavigationPropertyName
        });
      });
      
      logger.debug(`Discovered ${lookups.length} lookup relationships for ${logicalName}`);
      return lookups;
    } catch (error) {
      logger.error(`Failed to discover lookups for ${logicalName}`, error);
      return [];
    }
  }

  /**
   * Discover option sets (global and local)
   * @returns {Promise<Object>} Map of option set name to values
   */
  async discoverOptionSets() {
    try {
      logger.info('Discovering option sets...');
      
      const [globalOptionSets, entities] = await Promise.all([
        DataverseDataService.fetch('/GlobalOptionSetDefinitions').catch(() => ({ value: [] })),
        DataverseDataService.fetch('/EntityDefinitions?$select=LogicalName').catch(() => ({ value: [] }))
      ]);
      
      const optionSets = {};
      
      // Process global option sets
      (globalOptionSets.value || []).forEach(os => {
        const values = {};
        (os.Options || []).forEach(option => {
          if (option.Value != null) {
            values[option.Value] = option.Label?.UserLocalizedLabel?.Label || `Value ${option.Value}`;
          }
        });
        optionSets[os.Name] = values;
      });
      
      // Process local option sets from entities
      const entityPromises = (entities.value || [])
        .filter(e => e.LogicalName?.startsWith('new_'))
        .slice(0, 50) // Limit to avoid too many requests
        .map(async entity => {
          try {
            // Fetch without $select to get full OptionSet object (can't select complex types in $select)
            // This is acceptable for discovery function that's not called frequently
            const attrs = await DataverseDataService.fetch(
              `/EntityDefinitions(LogicalName='${entity.LogicalName}')/Attributes`
            ).catch(() => ({ value: [] }));
            
            (attrs.value || []).forEach(attr => {
              // Process local option sets (Picklist with OptionSet.Options)
              if (attr.OptionSet && attr.OptionSet.Options) {
                const key = `${entity.LogicalName}.${attr.LogicalName}`;
                const values = {};
                attr.OptionSet.Options.forEach(option => {
                  if (option.Value != null) {
                    values[option.Value] = option.Label?.UserLocalizedLabel?.Label || `Value ${option.Value}`;
                  }
                });
                optionSets[key] = values;
              }
            });
          } catch (error) {
            logger.warn(`Failed to fetch option sets for ${entity.LogicalName}`, error);
          }
        });
      
      await Promise.all(entityPromises);
      
      logger.info(`Discovered ${Object.keys(optionSets).length} option sets`);
      return optionSets;
    } catch (error) {
      logger.error('Failed to discover option sets', error);
      return {};
    }
  }

  /**
   * Discover complete schema for a table
   * @param {string} logicalName - Entity logical name
   * @returns {Promise<Object>} Complete table schema
   */
  async discoverTableSchema(logicalName) {
    try {
      const [columns, lookups] = await Promise.all([
        this.discoverTableColumns(logicalName),
        this.discoverLookups(logicalName)
      ]);
      
      // Get entity set name
      const entityDef = await DataverseDataService.fetch(
        `/EntityDefinitions(LogicalName='${logicalName}')?$select=EntitySetName,PrimaryIdAttribute`
      ).catch(() => ({}));
      
      return {
        logicalName,
        entitySetName: entityDef.EntitySetName,
        primaryKey: entityDef.PrimaryIdAttribute,
        columns,
        lookups
      };
    } catch (error) {
      logger.error(`Failed to discover schema for ${logicalName}`, error);
      throw error;
    }
  }

  /**
   * Discover complete schema for all tables
   * @param {boolean} useCache - Use cached results if available
   * @returns {Promise<Object>} Complete discovered schema
   */
  async discoverAllSchemas(useCache = true) {
    // Check cache
    if (useCache && this.discoveredSchema && this.cacheTime && 
        (Date.now() - this.cacheTime) < this.cacheTimeout) {
      logger.debug('Using cached discovered schema');
      return this.discoveredSchema;
    }
    
    try {
      logger.info('Discovering complete schema from Dataverse...');
      
      const tables = await this.discoverAllTables();
      const discoveredSchema = {};
      
      // Discover schema for each table (with rate limiting)
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        try {
          const schema = await this.discoverTableSchema(table.logicalName);
          discoveredSchema[table.logicalName] = schema;
          
          // Add delay to avoid rate limiting
          if (i < tables.length - 1 && i % 10 === 9) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          logger.warn(`Failed to discover schema for ${table.logicalName}`, error);
        }
      }
      
      // Cache results
      this.discoveredSchema = discoveredSchema;
      this.cacheTime = Date.now();
      
      logger.info(`Discovered schema for ${Object.keys(discoveredSchema).length} tables`);
      return discoveredSchema;
    } catch (error) {
      logger.error('Failed to discover all schemas', error);
      throw error;
    }
  }

  /**
   * Compare discovered schema with current schema
   * @param {Object} discoveredSchema - Discovered schema from Dataverse
   * @returns {Object} Comparison results
   */
  compareWithCurrentSchema(discoveredSchema = null) {
    const discovered = discoveredSchema || this.discoveredSchema;
    if (!discovered) {
      throw new Error('No discovered schema available. Call discoverAllSchemas() first.');
    }
    
    const currentSchema = DataverseSchema;
    const comparison = {
      newTables: [],
      missingTables: [],
      tableDifferences: {},
      newColumns: {},
      missingColumns: {},
      columnDifferences: {}
    };
    
    // Find schema keys in current schema
    const currentSchemaKeys = Object.keys(currentSchema);
    const currentTableNames = new Set(
      currentSchemaKeys.map(key => getTableName(key))
    );
    
    // Find new tables (in discovered but not in current)
    Object.keys(discovered).forEach(logicalName => {
      const entitySetName = discovered[logicalName].entitySetName;
      if (!currentTableNames.has(entitySetName)) {
        comparison.newTables.push({
          logicalName,
          entitySetName,
          displayName: logicalName
        });
      }
    });
    
    // Find missing tables (in current but not in discovered)
    currentSchemaKeys.forEach(schemaKey => {
      const tableName = getTableName(schemaKey);
      const found = Object.values(discovered).some(
        schema => schema.entitySetName === tableName
      );
      if (!found) {
        comparison.missingTables.push({
          schemaKey,
          tableName
        });
      }
    });
    
    // Compare columns for existing tables
    currentSchemaKeys.forEach(schemaKey => {
      const tableName = getTableName(schemaKey);
      const currentTable = currentSchema[schemaKey];
      
      // Find matching discovered table
      const discoveredTable = Object.values(discovered).find(
        schema => schema.entitySetName === tableName
      );
      
      if (!discoveredTable) return;
      
      const currentColumns = new Set(Object.values(currentTable.columns || {}));
      const discoveredColumns = new Set(
        discoveredTable.columns.map(col => col.logicalName)
      );
      
      // Find new columns
      const newCols = discoveredTable.columns.filter(
        col => !currentColumns.has(col.logicalName)
      );
      if (newCols.length > 0) {
        comparison.newColumns[schemaKey] = newCols;
      }
      
      // Find missing columns
      const missingCols = Array.from(currentColumns).filter(
        col => !discoveredColumns.has(col)
      );
      if (missingCols.length > 0) {
        comparison.missingColumns[schemaKey] = missingCols;
      }
    });
    
    logger.info('Schema comparison completed', {
      newTables: comparison.newTables.length,
      missingTables: comparison.missingTables.length,
      tablesWithNewColumns: Object.keys(comparison.newColumns).length,
      tablesWithMissingColumns: Object.keys(comparison.missingColumns).length
    });
    
    return comparison;
  }

  /**
   * Generate schema update code
   * @param {Object} comparison - Comparison results from compareWithCurrentSchema
   * @returns {string} Generated code to update schema
   */
  generateSchemaUpdateCode(comparison) {
    const updates = [];
    
    // Add new tables
    comparison.newTables.forEach(table => {
      updates.push(`// TODO: Add table ${table.logicalName} (${table.entitySetName})`);
    });
    
    // Add new columns
    Object.entries(comparison.newColumns).forEach(([schemaKey, columns]) => {
      columns.forEach(col => {
        updates.push(`// TODO: Add column ${col.logicalName} to ${schemaKey}`);
      });
    });
    
    return updates.join('\n');
  }

  /**
   * Validate current schema against Dataverse
   * @returns {Promise<Object>} Validation results
   */
  async validateSchema() {
    try {
      logger.info('Validating current schema against Dataverse...');
      
      const discovered = await this.discoverAllSchemas();
      const comparison = this.compareWithCurrentSchema(discovered);
      
      const validation = {
        isValid: comparison.newTables.length === 0 && 
                  Object.keys(comparison.newColumns).length === 0,
        comparison,
        errors: [],
        warnings: []
      };
      
      if (comparison.newTables.length > 0) {
        validation.warnings.push(`${comparison.newTables.length} new tables found in Dataverse`);
      }
      
      if (Object.keys(comparison.newColumns).length > 0) {
        validation.warnings.push(`New columns found in ${Object.keys(comparison.newColumns).length} tables`);
      }
      
      if (comparison.missingTables.length > 0) {
        validation.errors.push(`${comparison.missingTables.length} tables in schema not found in Dataverse`);
      }
      
      return validation;
    } catch (error) {
      logger.error('Schema validation failed', error);
      throw error;
    }
  }
}

export default new SchemaDiscoveryService();
