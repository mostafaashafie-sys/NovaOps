/**
 * DocType Mapper Utility
 * Maps docType names to numeric option set values for filtering
 */

import DataverseDataService from '@/services/DataverseDataService.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('DocTypeMapper');

// Cache for docType mappings (numeric value -> name)
let docTypeValueToNameCache = null;
// Cache for reverse mapping (name -> numeric value)
let docTypeNameToValueCache = null;
let cacheTimestamp = null;
const CACHE_TIMEOUT = 1000 * 60 * 60; // 1 hour

/**
 * Get docType option set values from Dataverse
 * Returns a map of numeric value -> name
 */
async function fetchDocTypeMappings() {
  try {
    const values = await DataverseDataService.getDocTypeOptionSetValues();
    
    // Create reverse mapping (name -> value) for case-insensitive lookup
    const nameToValue = {};
    for (const [numericValue, name] of Object.entries(values)) {
      if (name) {
        // Store multiple variations for case-insensitive matching
        const normalizedName = String(name).toLowerCase().trim();
        nameToValue[normalizedName] = parseInt(numericValue, 10);
        // Also store original case for exact match
        nameToValue[String(name).trim()] = parseInt(numericValue, 10);
      }
    }
    
    docTypeValueToNameCache = values;
    docTypeNameToValueCache = nameToValue;
    cacheTimestamp = Date.now();
    
    // Log all available docType names for debugging
    const allNames = Object.values(values).filter(Boolean);
    logger.info('DocType mappings cached from Dataverse', { 
      valueCount: Object.keys(values).length,
      nameCount: Object.keys(nameToValue).length,
      availableDocTypes: allNames,
      mappings: values
    });
    
    return { values, nameToValue };
  } catch (error) {
    logger.error('Failed to fetch docType mappings', error);
    return { values: {}, nameToValue: {} };
  }
}

/**
 * Get docType numeric value from name
 * @param {string} docTypeName - The docType name (e.g., "Sales", "Returns")
 * @returns {Promise<number|null>} - The numeric option set value or null if not found
 */
export async function getDocTypeNumericValue(docTypeName) {
  // Check cache
  if (!docTypeNameToValueCache || !cacheTimestamp || (Date.now() - cacheTimestamp) > CACHE_TIMEOUT) {
    await fetchDocTypeMappings();
  }
  
  if (!docTypeNameToValueCache) {
    return null;
  }
  
  // Try exact match first
  const exactMatch = docTypeNameToValueCache[String(docTypeName).trim()];
  if (exactMatch !== undefined) {
    return exactMatch;
  }
  
  // Try case-insensitive match
  const normalizedName = String(docTypeName).toLowerCase().trim();
  const caseInsensitiveMatch = docTypeNameToValueCache[normalizedName];
  if (caseInsensitiveMatch !== undefined) {
    return caseInsensitiveMatch;
  }
  
  // Try partial match (contains)
  for (const [name, value] of Object.entries(docTypeNameToValueCache)) {
    if (name.toLowerCase().includes(normalizedName) || normalizedName.includes(name.toLowerCase())) {
      logger.debug(`Found partial match for "${docTypeName}": "${name}" -> ${value}`);
      return value;
    }
  }
  
  // Log available docTypes to help debug
  const availableNames = Object.keys(docTypeNameToValueCache).filter(k => 
    !k.includes(' ') || k.toLowerCase() === k // Filter out normalized duplicates
  );
  logger.warn(`DocType name "${docTypeName}" not found in mappings. Available docTypes:`, availableNames);
  return null;
}

/**
 * Get docType name from numeric value
 * @param {number} numericValue - The numeric option set value
 * @returns {Promise<string|null>} - The docType name or null if not found
 */
export async function getDocTypeName(numericValue) {
  // Check cache
  if (!docTypeValueToNameCache || !cacheTimestamp || (Date.now() - cacheTimestamp) > CACHE_TIMEOUT) {
    await fetchDocTypeMappings();
  }
  
  if (!docTypeValueToNameCache) {
    return null;
  }
  
  return docTypeValueToNameCache[String(numericValue)] || null;
}

/**
 * Get all docType mappings
 * @returns {Promise<Object>} - Map of numeric value -> name
 */
export async function getAllDocTypeMappings() {
  if (!docTypeValueToNameCache || !cacheTimestamp || (Date.now() - cacheTimestamp) > CACHE_TIMEOUT) {
    await fetchDocTypeMappings();
  }
  
  return docTypeValueToNameCache || {};
}

/**
 * Clear the cache (useful for testing or when mappings change)
 */
export function clearCache() {
  docTypeValueToNameCache = null;
  docTypeNameToValueCache = null;
  cacheTimestamp = null;
  logger.debug('DocType mapping cache cleared');
}
