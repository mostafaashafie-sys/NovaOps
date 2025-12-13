import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Latest Actual End of Month Measure
 * Calculates end of month date for the last period with actual data
 * Formula: MAX(endOfMonth) WHERE netSales EXISTS
 * 
 * Note: This is a special measure that returns a date
 */
export const latestActualEOM: CalculationMeasure = {
  key: 'latestActualEOM',
  name: 'Latest Actual End of Month',
  description: 'End of month date for the last period with actual data',
  components: [
    {
      id: 'latestActualEOM-netSales',
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
