import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * AMS Current Year Full Measure
 * Calculates average monthly sales for full current year: actuals + forecast
 * Formula: (YTD actuals + YTG forecast) / 12
 */
export const amsCurrentYearFull: CalculationMeasure = {
  key: 'amsCurrentYearFull',
  name: 'AMS Current Year Full',
  description: 'Average monthly sales for full current year: actuals + forecast',
  components: [
    {
      id: 'amsCurrentYearFull-ytd',
      name: 'YTD AMS',
      source: {
        type: 'measure',
        measureKey: 'ytdAMS'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'amsCurrentYearFull-ytg',
      name: 'YTG AMS',
      source: {
        type: 'measure',
        measureKey: 'ytgAMS'
      },
      sortOrder: 1,
      operation: 'add'
    }
  ],
  metadata: {
    category: 'Average',
    unit: 'Tins'
  }
};
