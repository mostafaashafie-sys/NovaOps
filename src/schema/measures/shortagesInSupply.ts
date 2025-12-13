import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Shortages in Supply Measure
 * Calculates shortages quantity from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "Shortages/discrepancies in supply"
 */
export const shortagesInSupply: CalculationMeasure = {
  key: 'shortagesInSupply',
  name: 'Shortages in Supply',
  description: 'Shortages or discrepancies found during supply receipt',
  components: [
    {
      id: 'shortagesInSupply-shortages',
      name: 'Shortages in Supply',
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
            value: 'Shortages/discrepancies in supply'
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
