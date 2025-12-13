import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Growth vs AMA Measure
 * Calculates growth percentage compared to Average Moving Annual
 * Formula: (selectedMeasure - AMA) / AMA
 */
export const growthVsAMA: CalculationMeasure = {
  key: 'growthVsAMA',
  name: 'Growth vs AMA %',
  description: 'Growth percentage compared to Annual Moving Average',
  components: [
    {
      id: 'growthVsAMA-current',
      name: 'Current',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'growthVsAMA-ama',
      name: 'Average Moving Annual',
      source: {
        type: 'measure',
        measureKey: 'averageMovingAnnual'
      },
      sortOrder: 1,
      operation: 'divide'
    }
  ],
  metadata: {
    category: 'Growth',
    unit: 'Percentage'
  }
};
