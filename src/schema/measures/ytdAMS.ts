import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * YTD AMS (Year-to-Date Average Monthly Sales) Measure
 * Calculates year-to-date average monthly sales (actual data only)
 * Formula: SUM(netSales FROM yearStart TO lastActualDate) / monthsWithData
 */
export const ytdAMS: CalculationMeasure = {
  key: 'ytdAMS',
  name: 'YTD AMS',
  description: 'Year-to-date average monthly sales (actual data only)',
  components: [
    {
      id: 'ytdAMS-netSales',
      name: 'Net Sales',
      source: {
        type: 'measure',
        measureKey: 'netSales'
      },
      sortOrder: 0,
      timeIntelligence: {
        type: 'ytd'
      },
      aggregation: 'average',
      operation: 'sum'
    }
  ],
  metadata: {
    category: 'Average',
    unit: 'Tins'
  }
};
