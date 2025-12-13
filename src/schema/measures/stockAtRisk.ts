import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Stock at Risk Measure
 * Calculates quantity of stock approaching expiry or at risk of becoming unsellable
 * Formula: SUM(At Risk Quantity)
 */
export const stockAtRisk: CalculationMeasure = {
  key: 'stockAtRisk',
  name: 'Stock at Risk',
  description: 'Quantity of stock approaching expiry or at risk of becoming unsellable',
  components: [
    {
      id: 'stockAtRisk-risk',
      name: 'At Risk Quantity',
      source: {
        type: 'table',
        tableKey: 'futureInventoryForecasts',
        fieldName: 'atRiskQuantity',
        quantityField: 'atRiskQuantity'
      },
      aggregation: 'sum',
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Tins',
    thresholds: [
      { key: 'low', name: 'Low Risk', value: 100, operator: 'lessThan', description: 'Below 100 units' },
      { key: 'medium', name: 'Medium Risk', value: 500, operator: 'lessThan', description: '100-500 units' },
      { key: 'high', name: 'High Risk', value: 500, operator: 'greaterThanOrEqual', description: 'Above 500 units' }
    ]
  }
};
