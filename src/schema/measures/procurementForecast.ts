import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Procurement Forecast Measure
 * Calculates forecasted quantity for procurement planning
 * Formula: SUM(Forecast Quantity) WHERE country, SKU, and monthYear date range
 * Uses monthYear field for date filtering: date ge 'YYYY-MM-DD' and monthYear lt 'YYYY-MM-DD'
 */
export const procurementForecast: CalculationMeasure = {
  key: 'procurementForecast',
  name: 'Procurement Forecast',
  description: 'Forecasted quantity for procurement planning',
  components: [
    {
      id: 'procurementForecast-forecast',
      name: 'Forecast Quantity',
      source: {
        type: 'table',
        tableKey: 'forecasts',
        fieldName: 'forecastQty',
        quantityField: 'forecastQty'
      },
      aggregation: 'sum',
      sortOrder: 0,
      operation: 'sum',
      timeIntelligence: {
        type: 'custom',
        dateField: 'monthYear' // Use monthYear field instead of date for filtering
      }
    }
  ],
  metadata: {
    category: 'Forecast',
    unit: 'Tins'
  }
};
