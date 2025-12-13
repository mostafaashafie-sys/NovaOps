import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Average Moving Annual (AMA) Measure
 * Calculates rolling 12-month average of the selected measure
 * Formula: SUM(selectedMeasure FOR last 12 months) / 12
 */
export const averageMovingAnnual: CalculationMeasure = {
  key: 'averageMovingAnnual',
  name: 'Average Moving Annual (AMA)',
  description: 'Rolling 12-month average of the selected measure',
  components: [
    {
      id: 'averageMovingAnnual-selectedMeasure',
      name: 'Selected Measure',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      timeIntelligence: {
        type: 'rolling',
        periods: 12
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
