import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Growth vs LY Average Measure
 * Calculates growth percentage compared to last year monthly average
 * Formula: (selectedMeasure - lyAverage) / lyAverage
 */
export const growthVsLYAverage: CalculationMeasure = {
  key: 'growthVsLYAverage',
  name: 'Growth vs LY Average %',
  description: 'Growth percentage compared to last year monthly average',
  components: [
    {
      id: 'growthVsLYAverage-current',
      name: 'Current',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'growthVsLYAverage-lyAverage',
      name: 'LY Average Sales',
      source: {
        type: 'measure',
        measureKey: 'lastYearAverageSales'
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
