import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Budget Achievement Measure
 * Calculates budget achievement percentage
 * Formula: (Net Sales / Budget) * 100
 */
export const budgetAchievement: CalculationMeasure = {
  key: 'budgetAchievement',
  name: 'Budget Achievement %',
  description: 'Percentage of budget achieved based on net sales',
  components: [
    {
      id: 'budgetAchievement-netSales',
      name: 'Net Sales',
      source: {
        type: 'measure',
        measureKey: 'netSales'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'budgetAchievement-budget',
      name: 'Budget',
      source: {
        type: 'table',
        tableKey: 'budgets',
        fieldName: 'budgetedQty',
        quantityField: 'budgetedQty'
      },
      aggregation: 'sum',
      sortOrder: 1,
      operation: 'divide',
      timeIntelligence: {
        type: 'custom',
        dateField: 'monthYear' // Use monthYear field instead of date for filtering
      }
    }
  ],
  metadata: {
    category: 'Performance',
    unit: 'Percentage'
  }
};
