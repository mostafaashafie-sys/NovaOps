import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Past Last Year Average (PLY Average) Measure
 * Calculates monthly average sales from 2 years ago
 * Formula: SUM(selectedMeasure WHERE year = currentYear - 2) / 12
 */
export const pastLastYearAverage: CalculationMeasure = {
  key: 'pastLastYearAverage',
  name: 'PLY Average (Past Last Year)',
  description: 'Monthly average sales from 2 years ago',
  components: [
    {
      id: 'pastLastYearAverage-selectedMeasure',
      name: 'Selected Measure',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      timeIntelligence: {
        type: 'pastlastyear'
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
