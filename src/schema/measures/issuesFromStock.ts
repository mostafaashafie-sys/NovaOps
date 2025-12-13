import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Issues from Stock Measure
 * Calculates issues from stock for a given month
 * Uses actual stock movement if available, otherwise forecast × safety margin
 * Formula: IF(stockMovement IS BLANK, selectedMeasure × procurementSafeMargin, stockMovement)
 * 
 * Note: This requires conditional logic that will be handled in CalculationEngine
 * For now, we use stockMovement as primary with fallback logic
 */
export const issuesFromStock: CalculationMeasure = {
  key: 'issuesFromStock',
  name: 'Issues from Stock',
  description: 'Stock consumption for the period. Uses actual stock movement if available, otherwise forecast × safety margin.',
  components: [
    {
      id: 'issuesFromStock-stockMovement',
      name: 'Stock Movement',
      source: {
        type: 'measure',
        measureKey: 'stockMovement'
      },
      sortOrder: 0,
      operation: 'fallback' // Use if available, otherwise fallback to next
    },
    {
      id: 'issuesFromStock-selectedMeasure',
      name: 'Selected Measure',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 1,
      operation: 'multiply' // Multiply by safe margin if stockMovement not available
    }
  ],
  metadata: {
    category: 'StockCover',
    unit: 'Tins'
  }
};
