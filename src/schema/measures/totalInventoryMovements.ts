import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Total Inventory Movements Measure
 * Calculates net inventory movement for the period
 * Formula: IF(grossSales IS BLANK OR grossSales = 0) THEN procurementForecast * -1
 *          ELSE stocksReceived + positiveAdjustment - negativeAdjustment - grossSales + returns
 *          - samplesToHCP - focToPOS - expiry - damage - shortages
 */
export const totalInventoryMovements: CalculationMeasure = {
  key: 'totalInventoryMovements',
  name: 'Total Inventory Movements',
  description: 'Net inventory movement for the period: stocksIn - stocksOut. Uses forecast for future periods.',
  components: [
    {
      id: 'totalInventoryMovements-stocksReceived',
      name: 'Stocks Received',
      source: {
        type: 'measure',
        measureKey: 'stocksReceived'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'totalInventoryMovements-positiveAdjustment',
      name: 'Positive Stock Adjustment',
      source: {
        type: 'measure',
        measureKey: 'positiveStockAdjustment'
      },
      sortOrder: 1,
      operation: 'add'
    },
    {
      id: 'totalInventoryMovements-negativeAdjustment',
      name: 'Negative Stock Adjustment',
      source: {
        type: 'measure',
        measureKey: 'negativeStockAdjustment'
      },
      sortOrder: 2,
      operation: 'subtract'
    },
    {
      id: 'totalInventoryMovements-grossSales',
      name: 'Gross Sales',
      source: {
        type: 'measure',
        measureKey: 'grossSales'
      },
      sortOrder: 3,
      operation: 'subtract'
    },
    {
      id: 'totalInventoryMovements-returns',
      name: 'Returns',
      source: {
        type: 'measure',
        measureKey: 'returns'
      },
      sortOrder: 4,
      operation: 'add'
    },
    {
      id: 'totalInventoryMovements-samplesToHCP',
      name: 'Samples to HCP',
      source: {
        type: 'measure',
        measureKey: 'samplesToHCP'
      },
      sortOrder: 5,
      operation: 'subtract'
    },
    {
      id: 'totalInventoryMovements-focToPOS',
      name: 'FOC Products to POS',
      source: {
        type: 'measure',
        measureKey: 'focProductsToPOS'
      },
      sortOrder: 6,
      operation: 'subtract'
    },
    {
      id: 'totalInventoryMovements-expiry',
      name: 'Expiry',
      source: {
        type: 'measure',
        measureKey: 'expiry'
      },
      sortOrder: 7,
      operation: 'subtract'
    },
    {
      id: 'totalInventoryMovements-damage',
      name: 'Damage',
      source: {
        type: 'measure',
        measureKey: 'damage'
      },
      sortOrder: 8,
      operation: 'subtract'
    },
    {
      id: 'totalInventoryMovements-shortages',
      name: 'Shortages in Supply',
      source: {
        type: 'measure',
        measureKey: 'shortagesInSupply'
      },
      sortOrder: 9,
      operation: 'subtract'
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Tins'
  }
};
