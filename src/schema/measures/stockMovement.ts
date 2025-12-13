import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Stock Movement Measure
 * Calculates net stock movement: sales minus adjustments plus samples/FOC
 * Formula: Net Sales - Positive Stock Adjustment + Negative Stock Adjustment + FOC Products to POS + Samples to HCP
 */
export const stockMovement: CalculationMeasure = {
  key: 'stockMovement',
  name: 'Stock Movement',
  description: 'Net stock movement: sales minus adjustments plus samples/FOC',
  components: [
    {
      id: 'stockMovement-netSales',
      name: 'Net Sales',
      source: {
        type: 'measure',
        measureKey: 'netSales'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'stockMovement-positiveAdjustment',
      name: 'Positive Stock Adjustment',
      source: {
        type: 'measure',
        measureKey: 'positiveStockAdjustment'
      },
      sortOrder: 1,
      operation: 'subtract'
    },
    {
      id: 'stockMovement-negativeAdjustment',
      name: 'Negative Stock Adjustment',
      source: {
        type: 'measure',
        measureKey: 'negativeStockAdjustment'
      },
      sortOrder: 2,
      operation: 'add'
    },
    {
      id: 'stockMovement-foc',
      name: 'FOC Products to POS',
      source: {
        type: 'measure',
        measureKey: 'focProductsToPOS'
      },
      sortOrder: 3,
      operation: 'add'
    },
    {
      id: 'stockMovement-samples',
      name: 'Samples to HCP',
      source: {
        type: 'measure',
        measureKey: 'samplesToHCP'
      },
      sortOrder: 4,
      operation: 'add'
    }
  ],
  metadata: {
    category: 'StockCover',
    unit: 'Tins'
  }
};
