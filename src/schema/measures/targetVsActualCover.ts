import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Target vs Actual Cover Measure
 * Calculates gap between target cover and actual months cover
 * Formula: Target Cover Stock - Months Cover
 * 
 * Note: This depends on monthsCover which requires special calculation logic
 * For now, we define the structure - monthsCover will be implemented separately
 */
export const targetVsActualCover: CalculationMeasure = {
  key: 'targetVsActualCover',
  name: 'Target vs Actual Month Cover',
  description: 'Gap between target cover and actual months cover. Positive = understocked.',
  components: [
    {
      id: 'targetVsActualCover-target',
      name: 'Target Cover Stock',
      source: {
        type: 'measure',
        measureKey: 'targetCoverStock'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'targetVsActualCover-actual',
      name: 'Months Cover',
      source: {
        type: 'measure',
        measureKey: 'monthsCover'
      },
      sortOrder: 1,
      operation: 'subtract'
    }
  ],
  metadata: {
    category: 'StockCover',
    unit: 'Months',
    thresholds: [
      { key: 'critical', name: 'Critical', value: 1, operator: 'greaterThanOrEqual', description: '> 1 month short' },
      { key: 'warning', name: 'Warning', value: 0, operator: 'greaterThanOrEqual', description: '0-1 month short' },
      { key: 'healthy', name: 'Healthy', value: -1, operator: 'greaterThanOrEqual', description: 'On target' },
      { key: 'excess', name: 'Excess', value: -1, operator: 'lessThan', description: 'Overstocked' }
    ]
  }
};
