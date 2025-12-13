import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Expiry Measure
 * Calculates expiry quantity from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "Expiry"
 */
export const expiry: CalculationMeasure = {
  key: 'expiry',
  name: 'Expiry',
  description: 'Quantity of expired products written off',
  components: [
    {
      id: 'expiry-expiry',
      name: 'Expiry',
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
            value: 'Expiry'
          }
        ]
      },
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'DocType',
    unit: 'Tins'
  }
};
