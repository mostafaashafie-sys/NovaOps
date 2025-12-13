import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * AMS Last Year Measure
 * Calculates average monthly sales for the previous year
 * Formula: SUM(selectedMeasure WHERE year = lastActualYear - 1) / monthsWithData
 */
export const amsLastYear: CalculationMeasure = {
  key: 'amsLastYear',
  name: 'AMS Last Year',
  description: 'Average monthly sales for the previous year',
  components: [
    {
      id: 'amsLastYear-selectedMeasure',
      name: 'Selected Measure',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      timeIntelligence: {
        type: 'lastyear'
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
