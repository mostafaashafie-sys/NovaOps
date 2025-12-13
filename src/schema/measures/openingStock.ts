import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Opening Stock Measure
 * Calculates opening stock using actual inventory when available, falls back to future forecast
 * Formula: IF(actualOpeningStock EXISTS, actualOpeningStock, futureOpeningStock)
 */
export const openingStock: CalculationMeasure = {
  key: 'openingStock',
  name: 'Opening Stock',
  description: 'Stock quantity at the beginning of the period. Uses actual inventory data when available, falls back to future forecast.',
  components: [
    {
      id: 'openingStock-actual',
      name: 'Actual Opening Stock',
      source: {
        type: 'table',
        tableKey: 'actualInventory',
        fieldName: 'openingStock',
        quantityField: 'openingStock'
      },
      aggregation: 'sum',
      sortOrder: 0,
      operation: 'fallback' // Use if available, otherwise fallback to next
    },
    {
      id: 'openingStock-future',
      name: 'Future Opening Stock',
      source: {
        type: 'table',
        tableKey: 'futureInventoryForecasts',
        fieldName: 'futureOpeningStock',
        quantityField: 'futureOpeningStock'
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
