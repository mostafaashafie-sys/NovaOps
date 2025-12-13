import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * E&D (Expiry + Damage) Measure
 * Calculates combined expiry and damage
 * Formula: Expiry + Damage
 * 
 * This measure references other measures (expiry and damage) following
 * the Power BI pattern where measures can depend on other measures.
 */
export const ed: CalculationMeasure = {
  key: 'ed',
  name: 'E&D (Expiry + Damage)',
  description: 'Combined total of expired and damaged products',
  components: [
    {
      id: 'ed-expiry',
      name: 'Expiry',
      source: {
        type: 'measure',
        measureKey: 'expiry'
      },
      sortOrder: 0,
      operation: 'sum'
    },
    {
      id: 'ed-damage',
      name: 'Damage',
      source: {
        type: 'measure',
        measureKey: 'damage'
      },
      sortOrder: 1,
      operation: 'add'
    }
  ],
  metadata: {
    category: 'DocType',
    unit: 'Tins'
  }
};
