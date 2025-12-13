import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Samples to HCP Measure
 * Calculates samples to HCP quantity from raw aggregated data
 * Formula: SUM(Stock Out Quantity) WHERE DocType = "Samples to HCP"
 */
export const samplesToHCP: CalculationMeasure = {
  key: 'samplesToHCP',
  name: 'Samples to HCP',
  description: 'Sample products given to Healthcare Professionals',
  components: [
    {
      id: 'samplesToHCP-samples',
      name: 'Samples to HCP',
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
            value: 'Samples to HCP'
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
