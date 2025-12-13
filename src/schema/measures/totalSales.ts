import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Total Sales Measure
 * Calculates sum of all stock out quantities (all doc types)
 * Formula: SUM(Stock Out Quantity)
 */
export const totalSales: CalculationMeasure = {
  key: 'totalSales',
  name: 'Total Sales',
  description: 'Sum of all stock out quantities (all doc types)',
  components: [
    {
      id: 'totalSales-all',
      name: 'All Stock Out',
      source: {
        type: 'table',
        tableKey: 'rawAggregated',
        fieldName: 'stockOutQty',
        quantityField: 'stockOutQty'
      },
      aggregation: 'sum',
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Sales',
    unit: 'Tins'
  }
};
