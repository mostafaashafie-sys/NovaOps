/**
 * Schema Sync Service
 * Auto-discovery, validation, diff generation, and safe schema updates
 */

import SchemaDiscoveryService from './SchemaDiscoveryService.js';
import { DataverseSchema } from '@/config/dataverse-schema.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('SchemaSyncService');

class SchemaSyncService {
  constructor() {
    this.lastSyncTime = null;
    this.syncCache = null;
  }

  /**
   * Full sync from Dataverse
   * @param {boolean} forceRefresh - Force refresh even if cached
   * @returns {Promise<Object>} Sync results
   */
  async syncSchemaFromDataverse(forceRefresh = false) {
    try {
      logger.info('Starting schema sync from Dataverse...');

      // Discover schema
      const discoveredSchema = await SchemaDiscoveryService.discoverAllSchemas(!forceRefresh);

      // Compare with current
      const comparison = SchemaDiscoveryService.compareWithCurrentSchema(discoveredSchema);

      // Validate
      const validation = {
        isValid: comparison.newTables.length === 0 && 
                 Object.keys(comparison.newColumns).length === 0,
        comparison,
        errors: [],
        warnings: []
      };

      if (comparison.newTables.length > 0) {
        validation.warnings.push(`${comparison.newTables.length} new tables found`);
      }

      if (Object.keys(comparison.newColumns).length > 0) {
        validation.warnings.push(`New columns found in ${Object.keys(comparison.newColumns).length} tables`);
      }

      if (comparison.missingTables.length > 0) {
        validation.errors.push(`${comparison.missingTables.length} tables in schema not found in Dataverse`);
      }

      this.lastSyncTime = new Date();
      this.syncCache = {
        discoveredSchema,
        comparison,
        validation,
        timestamp: this.lastSyncTime
      };

      logger.info('Schema sync completed', {
        newTables: comparison.newTables.length,
        newColumns: Object.keys(comparison.newColumns).length,
        missingTables: comparison.missingTables.length
      });

      return {
        success: true,
        discoveredSchema,
        comparison,
        validation,
        timestamp: this.lastSyncTime
      };
    } catch (error) {
      logger.error('Schema sync failed', error);
      throw error;
    }
  }

  /**
   * Validate current schema
   * @returns {Promise<Object>} Validation results
   */
  async validateSchema() {
    try {
      return await SchemaDiscoveryService.validateSchema();
    } catch (error) {
      logger.error('Schema validation failed', error);
      throw error;
    }
  }

  /**
   * Generate schema diff report
   * @param {Object} comparison - Comparison results (optional, will fetch if not provided)
   * @returns {Object} Diff report
   */
  async generateSchemaDiff(comparison = null) {
    try {
      if (!comparison) {
        const syncResult = await this.syncSchemaFromDataverse();
        comparison = syncResult.comparison;
      }

      const diff = {
        summary: {
          newTables: comparison.newTables.length,
          missingTables: comparison.missingTables.length,
          tablesWithNewColumns: Object.keys(comparison.newColumns).length,
          tablesWithMissingColumns: Object.keys(comparison.missingColumns).length
        },
        newTables: comparison.newTables.map(table => ({
          logicalName: table.logicalName,
          entitySetName: table.entitySetName,
          displayName: table.displayName,
          action: 'add'
        })),
        missingTables: comparison.missingTables.map(table => ({
          schemaKey: table.schemaKey,
          tableName: table.tableName,
          action: 'remove'
        })),
        newColumns: Object.entries(comparison.newColumns).map(([schemaKey, columns]) => ({
          schemaKey,
          columns: columns.map(col => ({
            logicalName: col.logicalName,
            displayName: col.displayName,
            type: col.type,
            isOptionSet: col.isOptionSet,
            action: 'add'
          }))
        })),
        missingColumns: Object.entries(comparison.missingColumns).map(([schemaKey, columns]) => ({
          schemaKey,
          columns: columns.map(colName => ({
            logicalName: colName,
            action: 'remove'
          }))
        }))
      };

      logger.info('Schema diff generated', diff.summary);
      return diff;
    } catch (error) {
      logger.error('Failed to generate schema diff', error);
      throw error;
    }
  }

  /**
   * Apply schema updates safely
   * @param {Object} updates - Updates to apply
   * @param {boolean} dryRun - If true, only validate without applying
   * @returns {Promise<Object>} Update results
   */
  async applySchemaUpdate(updates, dryRun = true) {
    try {
      logger.info(`Applying schema updates (dryRun: ${dryRun})...`);

      const results = {
        applied: [],
        skipped: [],
        errors: [],
        warnings: []
      };

      // Validate updates
      if (!updates || typeof updates !== 'object') {
        throw new Error('Invalid updates object');
      }

      // Process new tables
      if (updates.newTables && Array.isArray(updates.newTables)) {
        for (const table of updates.newTables) {
          if (dryRun) {
            results.applied.push({
              type: 'newTable',
              table: table.logicalName,
              action: 'would add'
            });
          } else {
            // In a real implementation, this would update the schema file
            results.warnings.push(`Manual update required for table: ${table.logicalName}`);
          }
        }
      }

      // Process new columns
      if (updates.newColumns && typeof updates.newColumns === 'object') {
        for (const [schemaKey, columns] of Object.entries(updates.newColumns)) {
          for (const column of columns) {
            if (dryRun) {
              results.applied.push({
                type: 'newColumn',
                schemaKey,
                column: column.logicalName,
                action: 'would add'
              });
            } else {
              results.warnings.push(`Manual update required for column: ${schemaKey}.${column.logicalName}`);
            }
          }
        }
      }

      // Process missing tables (warn but don't remove automatically)
      if (updates.missingTables && Array.isArray(updates.missingTables)) {
        for (const table of updates.missingTables) {
          results.warnings.push(`Table in schema but not in Dataverse: ${table.schemaKey}. This may be intentional.`);
        }
      }

      if (!dryRun) {
        logger.warn('Schema file updates require manual intervention. Please update src/config/dataverse-schema.js manually.');
      }

      logger.info('Schema update completed', {
        applied: results.applied.length,
        warnings: results.warnings.length,
        errors: results.errors.length
      });

      return results;
    } catch (error) {
      logger.error('Failed to apply schema update', error);
      throw error;
    }
  }

  /**
   * Get sync status
   * @returns {Object} Sync status
   */
  getSyncStatus() {
    return {
      lastSyncTime: this.lastSyncTime,
      hasCache: !!this.syncCache,
      cacheAge: this.lastSyncTime 
        ? Math.floor((Date.now() - this.lastSyncTime.getTime()) / 1000 / 60)
        : null
    };
  }

  /**
   * Clear sync cache
   */
  clearCache() {
    this.syncCache = null;
    this.lastSyncTime = null;
    logger.info('Sync cache cleared');
  }

  /**
   * Auto-discover on app start (optional)
   * @param {Object} options - Options for auto-discovery
   * @returns {Promise<Object>} Discovery results
   */
  async autoDiscoverOnStart(options = {}) {
    const {
      notifyOnChanges = true,
      autoSync = false,
      cacheTimeout = 1000 * 60 * 60 // 1 hour
    } = options;

    try {
      logger.info('Auto-discovering schema changes...');

      // Check if we have recent cache
      if (this.syncCache && this.lastSyncTime) {
        const cacheAge = Date.now() - this.lastSyncTime.getTime();
        if (cacheAge < cacheTimeout) {
          logger.debug('Using cached schema discovery results');
          return {
            fromCache: true,
            ...this.syncCache
          };
        }
      }

      // Perform discovery
      const result = await this.syncSchemaFromDataverse();

      // Check for changes
      const hasChanges = result.comparison.newTables.length > 0 || 
                        Object.keys(result.comparison.newColumns).length > 0;

      if (hasChanges && notifyOnChanges) {
        logger.info('Schema changes detected', {
          newTables: result.comparison.newTables.length,
          newColumns: Object.keys(result.comparison.newColumns).length
        });
      }

      if (hasChanges && autoSync) {
        logger.info('Auto-syncing schema...');
        await this.applySchemaUpdate(result.comparison, false);
      }

      return result;
    } catch (error) {
      logger.error('Auto-discovery failed', error);
      throw error;
    }
  }
}

export default new SchemaSyncService();
