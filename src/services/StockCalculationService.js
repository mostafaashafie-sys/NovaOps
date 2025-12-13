import { calculationOrchestrator } from './CalculationOrchestrator.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('StockCalculationService');

/**
 * Stock Calculation Service
 * Uses CalculationOrchestrator for optimized measure calculations
 * Supports both single and batch measure execution
 */
class StockCalculationService {

  /**
   * Execute a measure using CalculationOrchestrator
   * 
   * @param {string} measureKey - Measure key to execute
   * @param {Object} filters - Additional filters to apply
   * @param {Object} context - Execution context (date range, country, SKU, etc.)
   * @returns {Promise<number>} Calculated measure value
   */
  async executeMeasure(measureKey, filters = {}, context = {}) {
    logger.debug('Executing measure via CalculationOrchestrator', { measureKey, hasFilters: Object.keys(filters).length > 0, context });
    try {
      const result = await calculationOrchestrator.executeMeasure(measureKey, filters, context);
      logger.debug('Measure executed successfully', { measureKey, result });
      return result;
    } catch (error) {
      logger.error('Error executing measure via CalculationOrchestrator', { measureKey, error: error.message, context });
      throw error;
    }
  }

  /**
   * Execute multiple measures in batch with dependency optimization
   * 
   * @param {string[]} measureKeys - Array of measure keys to execute
   * @param {Object} filters - Additional filters to apply
   * @param {Object} context - Execution context (date range, country, SKU, etc.)
   * @returns {Promise<Record<string, number>>} Map of measure keys to calculated values
   */
  async executeBatch(measureKeys, filters = {}, context = {}) {
    logger.debug('Executing batch measures via CalculationOrchestrator', { 
      measureCount: measureKeys.length, 
      measureKeys,
      hasFilters: Object.keys(filters).length > 0, 
      context 
    });
    try {
      const results = await calculationOrchestrator.executeBatch(measureKeys, filters, context);
      logger.debug('Batch measures executed successfully', { 
        measureCount: measureKeys.length,
        results: Object.keys(results)
      });
      return results;
    } catch (error) {
      const errorDetails = {
        message: error?.message || String(error),
        name: error?.name,
        stack: error?.stack,
        error: error // Include full error object
      };
      logger.error('Error executing batch measures via CalculationOrchestrator', { 
        measureKeys, 
        ...errorDetails,
        context 
      });
      throw error;
    }
  }

  /**
   * Calculate months cover (utility function, not a measure)
   * Calculates how many months of stock are available based on closing stock and future issues
   * 
   * @param {number} closingStock - Current closing stock
   * @param {Array} futureIssues - Array of { monthKey, issues } for future months
   * @returns {number} Months cover (e.g., 3.45 means 3 full months + 45% of 4th month)
   */
  calculateMonthsCoverFast(closingStock, futureIssues) {
    if (!closingStock || closingStock <= 0) {
      return 0;
    }

    if (!futureIssues || futureIssues.length === 0) {
      return 12; // Default to 12 months if no future issues
    }

    // Filter to only months with issues > 0
    const validMonths = futureIssues.filter(m => m.issues > 0);
    
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
    let monthsCover;
    
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
        // No more months, stock covers all
        monthsCover = fullMonths;
      }
    }

    return Math.round(monthsCover * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get measure catalog
   */
  getMeasureCatalog() {
    const { getMeasureCatalog } = require('@/schema/registry.js');
    return getMeasureCatalog();
  }
}

export default new StockCalculationService();
