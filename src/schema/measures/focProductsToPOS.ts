import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * FOC Products to POS Measure
 * Calculates FOC products to POS quantity from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "FOC Products to POS"
 */
export const focProductsToPOS: CalculationMeasure = {
  key: 'focProductsToPOS',
  name: 'FOC Products to POS',
  description: 'Free of charge products distributed to point of sale',
  components: [
    {
      id: 'focProductsToPOS-foc',
      name: 'FOC Products to POS',
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
            value: 'FOC Products to POS'
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
