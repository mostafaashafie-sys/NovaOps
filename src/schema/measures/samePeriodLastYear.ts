import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Same Period Last Year (SPLY) Measure
 * Calculates selected measure value for the same period in the previous year
 * Formula: CALCULATE(selectedMeasure, SAMEPERIODLASTYEAR(date))
 */
export const samePeriodLastYear: CalculationMeasure = {
  key: 'samePeriodLastYear',
  name: 'Same Period Last Year (SPLY)',
  description: 'Selected measure value for the same period in the previous year',
  components: [
    {
      id: 'samePeriodLastYear-selectedMeasure',
      name: 'Selected Measure',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      timeIntelligence: {
        type: 'sameperiodlastyear'
      },
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Growth',
    unit: 'Tins'
  }
};
