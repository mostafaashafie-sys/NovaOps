import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Closing Stock Measure
 * Calculates closing stock using actual inventory when available, falls back to future forecast
 * Formula: IF(actualClosingStock EXISTS, actualClosingStock, futureClosingStock)
 */
export const closingStock: CalculationMeasure = {
  key: 'closingStock',
  name: 'Closing Stock',
  description: 'Stock quantity at the end of the period. Uses actual inventory data when available, falls back to future forecast.',
  components: [
    {
      id: 'closingStock-actual',
      name: 'Actual Closing Stock',
      source: {
        type: 'table',
        tableKey: 'actualInventory',
        fieldName: 'closingStock',
        quantityField: 'closingStock'
      },
      aggregation: 'sum',
      sortOrder: 0,
      operation: 'fallback' // Use if available, otherwise fallback to next
    },
    {
      id: 'closingStock-future',
      name: 'Future Closing Stock',
      source: {
        type: 'table',
        tableKey: 'futureInventoryForecasts',
        fieldName: 'futureClosingStock',
        quantityField: 'futureClosingStock'
      },
      aggregation: 'sum',
      sortOrder: 1,
      operation: 'fallback' // Fallback if actual not available
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Tins'
  }
};
