import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Last Actual Data Date Measure
 * Calculates the most recent date with actual sales data (non-blank, non-zero)
 * Formula: MAX(date) WHERE netSales IS NOT BLANK AND netSales != 0
 * 
 * Note: This is a special measure that returns a date, not a number
 * Implementation will need special handling in CalculationEngine
 */
export const lastActualDataDate: CalculationMeasure = {
  key: 'lastActualDataDate',
  name: 'Last Actual Data Date',
  description: 'The most recent date with actual sales data (non-blank, non-zero)',
  components: [
    {
      id: 'lastActualDataDate-netSales',
      name: 'Net Sales',
      source: {
        type: 'measure',
        measureKey: 'netSales'
      },
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Date',
    requiresCustomCalculation: true,
    calculationType: 'dateLookup'
  }
};
