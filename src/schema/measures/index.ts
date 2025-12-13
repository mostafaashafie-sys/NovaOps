/**
 * Calculation Measures
 * Export all measure definitions
 */

import { netSales } from './netSales.js';
import { grossSales } from './grossSales.js';
import { returns } from './returns.js';
import { issuesFromStock } from './issuesFromStock.js';
import { budgetAchievement } from './budgetAchievement.js';
import { budget } from './budget.js';
import { procurementForecast } from './procurementForecast.js';
import { openingStock } from './openingStock.js';
import { closingStock } from './closingStock.js';
import { ed } from './ed.js';
import { damage } from './damage.js';
import { expiry } from './expiry.js';
import { focProductsToPOS } from './focProductsToPOS.js';
import { samplesToHCP } from './samplesToHCP.js';
import { shortagesInSupply } from './shortagesInSupply.js';
import { positiveStockAdjustment } from './positiveStockAdjustment.js';
import { negativeStockAdjustment } from './negativeStockAdjustment.js';
import { stocksReceived } from './stocksReceived.js';
import { stockMovement } from './stockMovement.js';
import { selectedMeasure } from './selectedMeasure.js';
import { targetCoverStock } from './targetCoverStock.js';
import { totalSales } from './totalSales.js';
import { stockAdjustment } from './stockAdjustment.js';
import { netStockIn } from './netStockIn.js';
import { stockAtRisk } from './stockAtRisk.js';
import { nonSellable } from './nonSellable.js';
import { forecastAdherence } from './forecastAdherence.js';
import { totalInventoryMovements } from './totalInventoryMovements.js';
import { orderQuantity } from './orderQuantity.js';
import { nonSystemOrderQty } from './nonSystemOrderQty.js';
import { targetVsActualCover } from './targetVsActualCover.js';
import { monthsCover } from './monthsCover.js';
// SPLY-related measures removed per user request
// import { samePeriodLastYear } from './samePeriodLastYear.js';
// import { growthVsSPLY } from './growthVsSPLY.js';
// Time intelligence measures removed per user request (returning NaN)
// import { growthVsAMA } from './growthVsAMA.js';
// import { growthVsLYAverage } from './growthVsLYAverage.js';
// import { growthVsMAS } from './growthVsMAS.js';
// import { growthVsPLYAverage } from './growthVsPLYAverage.js';
// import { variance } from './variance.js';
// import { averageMovingAnnual } from './averageMovingAnnual.js';
// import { lastYearAverageSales } from './lastYearAverageSales.js';
// import { pastLastYearAverage } from './pastLastYearAverage.js';
// import { movingAverageSales } from './movingAverageSales.js';
import { procurementSafeMargin } from './procurementSafeMargin.js';
import { lastActualDataDate } from './lastActualDataDate.js';
import { cumulativeInventoryMovements } from './cumulativeInventoryMovements.js';
import { ytdAMS } from './ytdAMS.js';
// import { ytgAMS } from './ytgAMS.js';
// import { amsCurrentYearFull } from './amsCurrentYearFull.js';
// import { amsLastYear } from './amsLastYear.js';
import { latestActualEOM } from './latestActualEOM.js';

import type { CalculationMeasure } from '../calculation-schema.js';

/**
 * All registered measures
 */
export const measures: Record<string, CalculationMeasure> = {
  // Sales measures
  grossSales,
  returns,
  netSales,
  totalSales,
  
  // Inventory measures
  openingStock,
  closingStock,
  stockAtRisk,
  nonSellable,
  netStockIn,
  
  // Forecast & Budget
  procurementForecast,
  budget,
  budgetAchievement,
  forecastAdherence,
  
  // Stock cover
  issuesFromStock,
  stockMovement,
  selectedMeasure,
  targetCoverStock,
  targetVsActualCover,
  monthsCover,
  
  // DocType measures
  ed,
  damage,
  expiry,
  focProductsToPOS,
  samplesToHCP,
  shortagesInSupply,
  positiveStockAdjustment,
  negativeStockAdjustment,
  stockAdjustment,
  stocksReceived,
  
  // Inventory movements
  totalInventoryMovements,
  
  // Order measures
  orderQuantity,
  nonSystemOrderQty,
  
  // Growth measures (SPLY and time intelligence measures removed per user request)
  // samePeriodLastYear,
  // growthVsSPLY,
  // growthVsAMA,
  // growthVsLYAverage,
  // growthVsMAS,
  // growthVsPLYAverage,
  // variance,
  
  // Average measures (time intelligence measures removed)
  // averageMovingAnnual,
  // lastYearAverageSales,
  // pastLastYearAverage,
  // movingAverageSales,
  ytdAMS,
  // ytgAMS,
  // amsCurrentYearFull,
  // amsLastYear,
  
  // Helper measures
  procurementSafeMargin,
  lastActualDataDate,
  latestActualEOM,
  
  // Cumulative measures
  cumulativeInventoryMovements
};

/**
 * Get a measure by key
 */
export function getMeasure(key: string): CalculationMeasure | undefined {
  return measures[key];
}

/**
 * Get all measures
 */
export function getAllMeasures(): CalculationMeasure[] {
  return Object.values(measures);
}

/**
 * Get all measure keys
 */
export function getMeasureKeys(): string[] {
  return Object.keys(measures);
}
