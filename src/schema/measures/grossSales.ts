import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Gross Sales Measure
 * Calculates gross sales (before returns) from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "Sales"
 */
export const grossSales: CalculationMeasure = {
  key: 'grossSales',
  name: 'Gross Sales',
  description: 'Total sales quantity before returns and adjustments',
  components: [
    {
      id: 'grossSales-sales',
      name: 'Sales',
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
            value: 'Sales'
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
