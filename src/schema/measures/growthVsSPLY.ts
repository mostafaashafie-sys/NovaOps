import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Growth vs SPLY Measure
 * Calculates year-over-year growth percentage compared to same period last year
 * Formula: (selectedMeasure - SPLY) / SPLY
 */
export const growthVsSPLY: CalculationMeasure = {
  key: 'growthVsSPLY',
  name: 'Growth vs SPLY %',
  description: 'Year-over-year growth percentage compared to same period last year',
  components: [
    {
      id: 'growthVsSPLY-current',
      name: 'Current',
      source: {
        type: 'measure',
        measureKey: 'selectedMeasure'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'growthVsSPLY-lastYear',
      name: 'Same Period Last Year',
      source: {
        type: 'measure',
        measureKey: 'samePeriodLastYear'
      },
      sortOrder: 1,
      operation: 'divide' // This will be handled as (current - lastYear) / lastYear in engine
    }
  ],
  metadata: {
    category: 'Growth',
    unit: 'Percentage',
    thresholds: [
      { key: 'critical', name: 'Critical', value: -0.1, operator: 'lessThan', description: '< -10%' },
      { key: 'warning', name: 'Warning', value: 0, operator: 'lessThan', description: '-10% to 0%' },
      { key: 'healthy', name: 'Healthy', value: 0.1, operator: 'lessThan', description: '0% to 10%' },
      { key: 'excess', name: 'Excess', value: 0.1, operator: 'greaterThanOrEqual', description: '>= 10%' }
    ]
  }
};
