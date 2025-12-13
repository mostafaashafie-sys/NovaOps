import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Cumulative Inventory Movements Measure
 * Calculates running total of all inventory movements up to the current date
 * Formula: CUMULATIVE_SUM(totalInventoryMovements) UP TO currentDate
 */
export const cumulativeInventoryMovements: CalculationMeasure = {
  key: 'cumulativeInventoryMovements',
  name: 'Cumulative Inventory Movements',
  description: 'Running total of all inventory movements up to the current date',
  components: [
    {
      id: 'cumulativeInventoryMovements-totalMovements',
      name: 'Total Inventory Movements',
      source: {
        type: 'measure',
        measureKey: 'totalInventoryMovements'
      },
      sortOrder: 0,
      timeIntelligence: {
        type: 'ytd'
      },
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Tins'
  }
};
