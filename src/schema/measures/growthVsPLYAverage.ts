import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Growth vs PLY Average Measure
 * Calculates growth percentage compared to past last year average
 * Formula: (selectedMeasure - PLYAverage) / PLYAverage
 */
export const growthVsPLYAverage: CalculationMeasure = {
  key: 'growthVsPLYAverage',
  name: 'Growth vs PLY Average %',
  description: 'Growth percentage compared to past last year average',
  components: [
    {
      id: 'growthVsPLYAverage-current',
      name: 'Current',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'growthVsPLYAverage-plyAverage',
      name: 'PLY Average',
      source: {
        type: 'measure',
        measureKey: 'pastLastYearAverage'
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
