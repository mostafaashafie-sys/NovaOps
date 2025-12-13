import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Damage Measure
 * Calculates damage quantity from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "Damage"
 */
export const damage: CalculationMeasure = {
  key: 'damage',
  name: 'Damage',
  description: 'Quantity of damaged products written off',
  components: [
    {
      id: 'damage-damage',
      name: 'Damage',
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
            value: 'Damage'
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
