import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Returns Measure
 * Calculates returns quantity from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "Return"
 */
export const returns: CalculationMeasure = {
  key: 'returns',
  name: 'Returns',
  description: 'Quantity of products returned by customers',
  components: [
    {
      id: 'returns-return',
      name: 'Returns',
      source: {
        type: 'table',
        tableKey: 'rawAggregated',
        fieldName: 'stockOutQty',
        quantityField: 'stockOutQty'
      },
      aggregation: 'sum',
      filters: {
        logic: 'AND',
        conditions: [
          {
            column: 'docType',
            operator: 'equals',
            value: 'Return'
          }
        ]
      },
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Sales',
    unit: 'Tins'
  }
};
