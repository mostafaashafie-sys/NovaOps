import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * Net Sales Measure
 * Calculates net sales from gross sales minus returns
 * Formula: Gross Sales - Returns
 * 
 * This measure references other measures (grossSales and returns) following
 * the Power BI pattern where measures can depend on other measures.
 */
export const netSales: CalculationMeasure = {
  key: 'netSales',
  name: 'Net Sales',
  description: 'Net sales calculated from gross sales minus returns - the actual sales performance',
  components: [
    {
      id: 'netSales-grossSales',
      name: 'Gross Sales',
      source: {
        type: 'measure',
        measureKey: 'grossSales'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'netSales-returns',
      name: 'Returns',
      source: {
        type: 'measure',
        measureKey: 'returns'
      },
      sortOrder: 1,
      operation: 'subtract'
    }
  ],
  metadata: {
    category: 'Sales',
    unit: 'Tins'
  }
};
