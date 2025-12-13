import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Last Year Average Sales (LY Average Sales) Measure
 * Calculates monthly average sales for the previous calendar year
 * Formula: SUM(selectedMeasure WHERE year = currentYear - 1) / 12
 */
export const lastYearAverageSales: CalculationMeasure = {
  key: 'lastYearAverageSales',
  name: 'LY Average Sales',
  description: 'Monthly average sales for the previous calendar year',
  components: [
    {
      id: 'lastYearAverageSales-selectedMeasure',
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
