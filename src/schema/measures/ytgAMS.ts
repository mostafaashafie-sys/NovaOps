import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * YTG AMS (Year-to-Go Average Monthly Sales) Measure
 * Calculates year-to-go average monthly sales (forecast for remaining months)
 * Formula: SUM(forecast FROM lastActualDate TO yearEnd) / remainingMonths
 */
export const ytgAMS: CalculationMeasure = {
  key: 'ytgAMS',
  name: 'YTG AMS',
  description: 'Year-to-go average monthly sales (forecast for remaining months)',
  components: [
    {
      id: 'ytgAMS-selectedMeasure',
      name: 'Selected Measure',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      // Note: This requires forward-looking from lastActualDate to yearEnd
      // Will be handled by custom date range in context
      aggregation: 'average',
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Average',
    unit: 'Tins'
  }
};
