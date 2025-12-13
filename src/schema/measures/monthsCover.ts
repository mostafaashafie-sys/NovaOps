import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Months Cover Measure
 * CRITICAL CALCULATION: Determines how many months the current stock will last.
 * 
 * Algorithm:
 * 1. Get closing stock and next 12 months of projected consumption (Issues from Stock)
 * 2. Iteratively subtract each month's consumption from stock
 * 3. When stock depletes within a month, calculate fractional month
 * 4. If stock lasts >12 months, divide by average monthly consumption
 * 
 * This uses FORWARD-LOOKING consumption (forecast) not historical averages.
 * 
 * Formula (simplified for schema):
 * - Calculate cumulative consumption for months 1-12
 * - Find where stock depletes
 * - Return fractional months
 * 
 * NOTE: This measure requires special implementation in CalculationEngine
 * as it needs forward-looking date calculations and iterative logic.
 */
export const monthsCover: CalculationMeasure = {
  key: 'monthsCover',
  name: 'Months Cover',
  description: `
    CRITICAL CALCULATION: Determines how many months the current stock will last.
    
    Algorithm:
    1. Get closing stock and next 12 months of projected consumption (Issues from Stock)
    2. Iteratively subtract each month's consumption from stock
    3. When stock depletes within a month, calculate fractional month
    4. If stock lasts >12 months, divide by average monthly consumption
    
    This uses FORWARD-LOOKING consumption (forecast) not historical averages.
  `,
  components: [
    {
      id: 'monthsCover-closingStock',
      name: 'Closing Stock',
      source: {
        type: 'measure',
        measureKey: 'closingStock'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'monthsCover-issuesFromStock',
      name: 'Issues from Stock',
      source: {
        type: 'measure',
        measureKey: 'issuesFromStock'
      },
      sortOrder: 1,
      operation: 'sum' // This will be used for forward-looking calculation
    }
  ],
  metadata: {
    category: 'StockCover',
    unit: 'Months',
    thresholds: [
      { key: 'critical', name: 'Critical', value: 2, operator: 'lessThan', description: '< 2 months' },
      { key: 'warning', name: 'Warning', value: 3, operator: 'lessThan', description: '2-3 months' },
      { key: 'healthy', name: 'Healthy', value: 4, operator: 'lessThan', description: '3-4 months' },
      { key: 'excess', name: 'Excess', value: 4, operator: 'greaterThanOrEqual', description: '>= 4 months' }
    ],
    // Special flag - handled by CalculationEngine.calculateMonthsCover()
    requiresCustomCalculation: true,
    calculationType: 'forwardLooking'
  }
};
