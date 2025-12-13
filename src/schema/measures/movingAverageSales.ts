import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Moving Average Sales (MAS) Measure
 * Calculates average sales for a user-selected number of past months
 * Formula: SUM(selectedMeasure FOR last N months) / N
 * 
 * Note: The number of months is typically configurable (default: 3)
 */
export const movingAverageSales: CalculationMeasure = {
  key: 'movingAverageSales',
  name: 'MAS (Moving Average Sales)',
  description: 'Average sales for a user-selected number of past months',
  components: [
    {
      id: 'movingAverageSales-selectedMeasure',
      name: 'Selected Measure',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      timeIntelligence: {
        type: 'rolling',
        periods: 3 // Default 3 months, can be overridden in context
      },
      aggregation: 'average',
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Average',
    unit: 'Tins'
  }
};
