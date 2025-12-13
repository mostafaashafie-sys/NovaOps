import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Forecast Adherence Measure
 * Calculates how closely actual sales match the forecast
 * Formula: Net Sales / Procurement Forecast
 */
export const forecastAdherence: CalculationMeasure = {
  key: 'forecastAdherence',
  name: 'Forecast Adherence %',
  description: 'How closely actual sales match the forecast (Net Sales / Forecast)',
  components: [
    {
      id: 'forecastAdherence-netSales',
      name: 'Net Sales',
      source: {
        type: 'measure',
        measureKey: 'netSales'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'forecastAdherence-forecast',
      name: 'Procurement Forecast',
      source: {
        type: 'measure',
        measureKey: 'procurementForecast'
      },
      sortOrder: 1,
      operation: 'divide'
    }
  ],
  metadata: {
    category: 'Forecast',
    unit: 'Percentage',
    thresholds: [
      { key: 'critical', name: 'Critical', value: 0.7, operator: 'lessThan', description: 'Below 70%' },
      { key: 'warning', name: 'Warning', value: 0.9, operator: 'lessThan', description: '70-90%' },
      { key: 'healthy', name: 'Healthy', value: 1.1, operator: 'lessThan', description: '90-110%' },
      { key: 'excess', name: 'Excess', value: 1.1, operator: 'greaterThanOrEqual', description: 'Above 110%' }
    ]
  }
};
