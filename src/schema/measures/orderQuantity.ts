import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Order Quantity Measure
 * Calculates total ordered quantity from order items
 * Formula: SUM(Order Item Qty)
 */
export const orderQuantity: CalculationMeasure = {
  key: 'orderQuantity',
  name: 'Order Quantity',
  description: 'Total ordered quantity from order items',
  components: [
    {
      id: 'orderQuantity-qty',
      name: 'Order Item Qty',
      source: {
        type: 'table',
        tableKey: 'orderItems',
        fieldName: 'orderItemQty',
        quantityField: 'orderItemQty'
      },
      aggregation: 'sum',
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Forecast',
    unit: 'Tins'
  }
};
