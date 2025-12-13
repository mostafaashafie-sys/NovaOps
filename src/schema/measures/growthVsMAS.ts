import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Growth vs MAS Measure
 * Calculates growth percentage compared to Moving Average Sales
 * Formula: (selectedMeasure - MAS) / MAS
 */
export const growthVsMAS: CalculationMeasure = {
  key: 'growthVsMAS',
  name: 'Growth vs MAS %',
  description: 'Growth percentage compared to Moving Average Sales',
  components: [
    {
      id: 'growthVsMAS-current',
      name: 'Current',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'growthVsMAS-mas',
      name: 'Moving Average Sales',
      source: {
        type: 'measure',
        measureKey: 'movingAverageSales'
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
