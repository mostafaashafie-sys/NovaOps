import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Stocks Received Measure
 * Calculates stocks received quantity from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "Stocks Received"
 */
export const stocksReceived: CalculationMeasure = {
  key: 'stocksReceived',
  name: 'Stocks Received',
  description: 'Quantity of stock received from shipments',
  components: [
    {
      id: 'stocksReceived-received',
      name: 'Stocks Received',
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
            value: 'Stocks Received'
          }
        ]
      },
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Tins'
  }
};
