import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Target Cover Stock Measure
 * Calculates target number of months of stock cover to maintain
 * Formula: SUM(No Of Months) WHERE SKU IN selectedSKUs
 */
export const targetCoverStock: CalculationMeasure = {
  key: 'targetCoverStock',
  name: 'Target Cover Stock',
  description: 'Target number of months of stock cover to maintain',
  components: [
    {
      id: 'targetCoverStock-months',
      name: 'No Of Months',
      source: {
        type: 'table',
        tableKey: 'targetCoverStock',
        fieldName: 'noOfMonths',
        quantityField: 'noOfMonths'
      },
      aggregation: 'sum',
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'StockCover',
    unit: 'Months'
  }
};
