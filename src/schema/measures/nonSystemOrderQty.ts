import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Non-System Order Quantity Measure
 * Calculates orders not yet in the system (status != 100000000)
 * Formula: SUM(Order Item Qty) WHERE orderPlacementStatus != 100000000
 */
export const nonSystemOrderQty: CalculationMeasure = {
  key: 'nonSystemOrderQty',
  name: 'Non-System Order Quantity',
  description: 'Orders not yet in the system (status != 100000000)',
  components: [
    {
      id: 'nonSystemOrderQty-qty',
      name: 'Non-System Order Qty',
      source: {
        type: 'table',
        tableKey: 'orderItems',
        fieldName: 'orderItemQty',
        quantityField: 'orderItemQty'
      },
      aggregation: 'sum',
      filters: {
        logic: 'AND',
        conditions: [
          {
            column: 'orderPlacementStatus',
            operator: 'notEquals',
            value: 100000000 // System Forecasted Order
          }
        ]
      },
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Forecast',
    unit: 'Tins'
  }
};
