import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Positive Stock Adjustment Measure
 * Calculates positive stock adjustment quantity from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "Positive Stock Adjustment"
 */
export const positiveStockAdjustment: CalculationMeasure = {
  key: 'positiveStockAdjustment',
  name: 'Positive Stock Adjustment',
  description: 'Stock increases from inventory adjustments (found stock, corrections)',
  components: [
    {
      id: 'positiveStockAdjustment-positive',
      name: 'Positive Stock Adjustment',
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
            value: 'Positive Stock Adjustment'
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
