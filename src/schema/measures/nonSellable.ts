import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Non-Sellable Stock Measure
 * Calculates quantity of stock that cannot be sold (expired, damaged, quarantined)
 * Formula: SUM(Non-Sellable Quantity)
 */
export const nonSellable: CalculationMeasure = {
  key: 'nonSellable',
  name: 'Non-Sellable Stock',
  description: 'Quantity of stock that cannot be sold (expired, damaged, quarantined)',
  components: [
    {
      id: 'nonSellable-quantity',
      name: 'Non-Sellable Quantity',
      source: {
        type: 'table',
        tableKey: 'futureInventoryForecasts',
        fieldName: 'nonSellableQuantity',
        quantityField: 'nonSellableQuantity'
      },
      aggregation: 'sum',
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Tins'
  }
};
