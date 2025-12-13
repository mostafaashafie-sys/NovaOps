import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Net Stock In Measure
 * Calculates net incoming stock: received minus shortages
 * Formula: Stocks Received - Shortages in Supply
 */
export const netStockIn: CalculationMeasure = {
  key: 'netStockIn',
  name: 'Net Stock In',
  description: 'Net incoming stock: received minus shortages',
  components: [
    {
      id: 'netStockIn-received',
      name: 'Stocks Received',
      source: {
        type: 'measure',
        measureKey: 'stocksReceived'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'netStockIn-shortages',
      name: 'Shortages in Supply',
      source: {
        type: 'measure',
        measureKey: 'shortagesInSupply'
      },
      sortOrder: 1,
      operation: 'subtract'
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Tins'
  }
};
