import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Budget Measure
 * Calculates budgeted sales quantity for the period
 * Formula: SUM(Budgeted Quantity) WHERE country, SKU, and monthYear date range
 * Uses monthYear field for date filtering: monthYear ge 'YYYY-MM-DD' and monthYear lt 'YYYY-MM-DD'
 */
export const budget: CalculationMeasure = {
  key: 'budget',
  name: 'Budget',
  description: 'Budgeted sales quantity for the period',
  components: [
    {
      id: 'budget-budgeted',
      name: 'Budgeted Quantity',
      source: {
        type: 'table',
        tableKey: 'budgets',
        fieldName: 'budgetedQty',
        quantityField: 'budgetedQty'
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
    category: 'Budget',
    unit: 'Tins'
  }
};
