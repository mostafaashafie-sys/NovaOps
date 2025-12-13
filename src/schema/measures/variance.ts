import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Variance Measure
 * Calculates absolute difference between current gross sales and same period last year
 * Formula: grossSales - samePeriodLastYear
 */
export const variance: CalculationMeasure = {
  key: 'variance',
  name: 'Variance',
  description: 'Absolute difference between current gross sales and same period last year',
  components: [
    {
      id: 'variance-grossSales',
      name: 'Gross Sales',
      source: {
        type: 'measure',
        measureKey: 'grossSales'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'variance-sply',
      name: 'Same Period Last Year',
      source: {
        type: 'measure',
        measureKey: 'samePeriodLastYear'
      },
      sortOrder: 1,
      operation: 'subtract'
    }
  ],
  metadata: {
    category: 'Growth',
    unit: 'Tins'
  }
};
