import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Negative Stock Adjustment Measure
 * Calculates negative stock adjustment quantity from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "Negative Stock Adjustment"
 */
export const negativeStockAdjustment: CalculationMeasure = {
  key: 'negativeStockAdjustment',
  name: 'Negative Stock Adjustment',
  description: 'Stock decreases from inventory adjustments (shrinkage, corrections)',
  components: [
    {
      id: 'negativeStockAdjustment-negative',
      name: 'Negative Stock Adjustment',
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
            value: 'Negative Stock Adjustment'
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
