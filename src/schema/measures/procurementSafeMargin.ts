import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Procurement Safe Margin Measure
 * Calculates safety factor applied to forecasts (typically 1.0-1.2)
 * Formula: SUM(procurementSafeMargin.margin)
 */
export const procurementSafeMargin: CalculationMeasure = {
  key: 'procurementSafeMargin',
  name: 'Procurement Safe Margin',
  description: 'Safety factor applied to forecasts (typically 1.0-1.2)',
  components: [
    {
      id: 'procurementSafeMargin-margin',
      name: 'Margin',
      source: {
        type: 'table',
        tableKey: 'procurementSafeMargin',
        fieldName: 'margin',
        quantityField: 'margin'
      },
      aggregation: 'sum',
      sortOrder: 0,
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Factor'
  }
};
