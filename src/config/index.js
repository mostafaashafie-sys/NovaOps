/**
 * Config Barrel Export
 * Centralized exports for all configuration
 */

export { 
  DataverseSchema,
  DATAVERSE_BASE_URL,
  getTableSchema, 
  getTableName, 
  getPrimaryKey, 
  getColumnName, 
  getLookupBinding, 
  getFilterField 
} from './dataverse-schema.js';
export { msalInstance, msalConfig, getDataverseScopes } from './msal.config.js';
export { AppConstants, default as AppConstantsDefault } from './app.constants.js';

