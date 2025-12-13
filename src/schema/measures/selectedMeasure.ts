import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Selected Measure
 * Dynamic measure selector that returns the most appropriate value:
 * 1. Net Sales (if available) - actual sales data
 * 2. Procurement Forecast (if no sales) - forecasted data
 * 3. Budget (fallback) - budgeted data
 * 
 * Formula: COALESCE(netSales, procurementForecast, budget)
 * Used as input for most growth and average calculations.
 */
export const selectedMeasure: CalculationMeasure = {
  key: 'selectedMeasure',
  name: 'Selected Measure',
  description: 'Dynamic measure selector: Net Sales → Procurement Forecast → Budget',
  components: [
    {
      id: 'selectedMeasure-netSales',
      name: 'Net Sales',
      source: {
        type: 'measure',
        measureKey: 'netSales'
      },
      sortOrder: 0,
      operation: 'fallback' // Use if available, otherwise fallback to next
    },
    {
      id: 'selectedMeasure-procurementForecast',
      name: 'Procurement Forecast',
      source: {
        type: 'measure',
        measureKey: 'procurementForecast'
      },
      sortOrder: 1,
      operation: 'fallback' // Fallback if netSales not available
    },
    {
      id: 'selectedMeasure-budget',
      name: 'Budget',
      source: {
        type: 'measure',
        measureKey: 'budget'
      },
      sortOrder: 2,
      operation: 'fallback' // Final fallback
    }
  ],
  metadata: {
    category: 'Inventory',
    unit: 'Tins'
  }
};
