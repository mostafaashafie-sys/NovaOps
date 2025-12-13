import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Stock Adjustment Measure
 * Calculates net stock adjustment (positive minus negative)
 * Formula: Positive Stock Adjustment - Negative Stock Adjustment
 */
export const stockAdjustment: CalculationMeasure = {
  key: 'stockAdjustment',
  name: 'Net Stock Adjustment',
  description: 'Net stock adjustment (positive minus negative)',
  components: [
    {
      id: 'stockAdjustment-positive',
      name: 'Positive Stock Adjustment',
      source: {
        type: 'measure',
        measureKey: 'positiveStockAdjustment'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'stockAdjustment-negative',
      name: 'Negative Stock Adjustment',
      source: {
        type: 'measure',
        measureKey: 'negativeStockAdjustment'
      },
      sortOrder: 1,
      operation: 'subtract'
    }
  ],
  metadata: {
    category: 'DocType',
    unit: 'Tins'
  }
};
