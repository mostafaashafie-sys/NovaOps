import DataverseDataService from './DataverseDataService.js';
import OrderItemService from './OrderItemService.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('StockCoverService');

/**
 * Stock Cover Service
 * Handles stock cover calculations and data management
 */
class StockCoverService {
  constructor() {
    this.dataverseService = DataverseDataService;
  }

  /**
   * Get stock cover data for a country
   * Merges order items from OrderItemService into stock cover data
   * Note: This is a business logic method that aggregates data from multiple sources
   * 
   * @param {string} countryId - Country ID
   * @param {number} baseStock - Starting stock (default: 0)
   * @param {boolean} calculateMetrics - Whether to calculate opening/closing stock, consumption, months cover (default: true)
   * @param {Array} skus - Optional: Cached SKU data to avoid duplicate fetches. If not provided, will fetch SKUs.
   */
  async getStockCoverData(countryId, baseStock = 0, calculateMetrics = true, skus = null) {
    logger.info('Fetching stock cover data from Dataverse', { countryId });
    
    // Get forecasts, budgets, order items, actual inventory, raw aggregated, and docTypeCalculations
    const [forecasts, budgets, orderItems, actualInventory, rawAggregated, docTypeCalculations] = await Promise.all([
      this.dataverseService.getForecasts({ countryId }),
      this.dataverseService.getBudgets({ countryId }),
      OrderItemService.getOrderItems({ countryId }),
      this.dataverseService.getActualInventory({ countryId }),
      this.dataverseService.getRawAggregated({ countryId }),
      this.dataverseService.getDocTypeCalculations() // Fetch all docTypeCalculations (not country-specific)
    ]);
    
    // Build docType sign map for quick lookup
    // docTypeSign: '+' or 1 = positive (adds to sales), '-' or -1 = negative (returns, subtracts from sales)
    // We multiply quantity by sign to get net sales (sales - returns)
    const docTypeSignMap = {};
    if (docTypeCalculations && docTypeCalculations.length > 0) {
      docTypeCalculations.forEach(dtc => {
        if (dtc.docType != null) {
          const sign = dtc.docTypeSign;
          // Convert sign to number: '+' or 'Positive' = 1, '-' or 'Negative' = -1
          if (sign === '-' || sign === 'Negative' || sign === -1) {
            docTypeSignMap[dtc.docType] = -1;
          } else {
            docTypeSignMap[dtc.docType] = 1; // Default to +1 (positive/sales)
          }
        }
      });
      logger.info('DocType calculations loaded', {
        countryId,
        docTypeCalculationsCount: docTypeCalculations.length,
        docTypeSignMapSample: Object.entries(docTypeSignMap).slice(0, 10).map(([docType, sign]) => ({ docType, sign }))
      });
    }
    
    // Log sample raw aggregated record to see available fields
    if (rawAggregated && rawAggregated.length > 0) {
      const sample = rawAggregated[0];
      logger.info('Raw aggregated sample record structure', {
        id: sample.id,
        date: sample.date,
        docType: sample.docType,
        channel: sample.channel,
        allFields: Object.keys(sample),
        fieldValues: Object.entries(sample).reduce((acc, [key, value]) => {
          if (typeof value !== 'object' || value === null) {
            acc[key] = value;
          }
          return acc;
        }, {})
      });
    }
    
    logger.info('Data fetched from Dataverse', {
      countryId,
      forecastCount: forecasts?.length || 0,
      budgetCount: budgets?.length || 0,
      orderItemCount: orderItems?.length || 0,
      actualInventoryCount: actualInventory?.length || 0,
      rawAggregatedCount: rawAggregated?.length || 0,
      docTypeCalculationsCount: docTypeCalculations?.length || 0,
      forecastMonths: forecasts?.map(f => `${f.year}-${String(f.month).padStart(2, '0')}`).sort().slice(0, 5),
      budgetMonths: budgets?.map(b => `${b.year}-${String(b.month).padStart(2, '0')}`).sort().slice(0, 5),
      actualInventoryMonths: actualInventory?.map(inv => {
        if (!inv.date) return null;
        const dateObj = inv.date instanceof Date ? inv.date : new Date(inv.date);
        if (isNaN(dateObj.getTime())) return null;
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      }).filter(Boolean).sort().slice(0, 5)
    });
    
    // Get SKUs filtered by country assignment
    // Use provided SKUs if available (from cache), otherwise fetch and filter
    let skuMap = {};
    let allSkus = skus;
    
    try {
      if (!allSkus) {
        // Fetch all SKUs first
        allSkus = await this.dataverseService.getSkus();
      }
      
      // If countryId is provided, filter SKUs by country assignment
      if (countryId && allSkus) {
        try {
          const assignments = await this.dataverseService.getSkuCountryAssignments({ countryId });
          const assignedSkuIds = new Set();
          
          // Extract SKU IDs from assignments
          (Array.isArray(assignments) ? assignments : []).forEach(assignment => {
            const skuId = assignment.sku?.id || assignment.skuId || assignment._new_sku_value;
            if (skuId) {
              assignedSkuIds.add(skuId);
            }
          });
          
          // Filter SKUs to only include those assigned to the country
          allSkus = allSkus.filter(sku => assignedSkuIds.has(sku.id));
        } catch (error) {
          logger.warn('Could not fetch SKU country assignments, showing all SKUs', error);
          // If filtering fails, show all SKUs (fallback behavior)
        }
      }
      
      // Create SKU map for name lookup
      if (allSkus) {
        skuMap = allSkus.reduce((acc, sku) => {
          acc[sku.id] = sku.name;
          return acc;
        }, {});
      }
    } catch (error) {
      logger.warn('Could not fetch SKU names, will use names from data', error);
    }
    
    // Helper to get SKU name
    const getSkuName = (skuId, fallbackName) => {
      return skuMap[skuId] || fallbackName || skuId;
    };
    
    // Group by SKU and month
    const stockCover = {};
    
    // Process forecasts
    forecasts.forEach(f => {
      const skuId = f.skuId || f._new_sku_value;
      if (!skuId) return;
      const monthKey = `${f.year}-${String(f.month).padStart(2, '0')}`;
      
      if (!stockCover[skuId]) {
        const skuName = getSkuName(skuId, f.sku?.name || f.skuName);
        stockCover[skuId] = { sku: { id: skuId, name: skuName }, months: {} };
      }
      if (!stockCover[skuId].months[monthKey]) {
        stockCover[skuId].months[monthKey] = { monthKey, orderItems: [] };
      }
      stockCover[skuId].months[monthKey].forecast = f.forecastQty || 0;
    });
    
    // Process budgets
    budgets.forEach(b => {
      const skuId = b.skuId || b._new_sku_value;
      if (!skuId) return;
      const monthKey = `${b.year}-${String(b.month).padStart(2, '0')}`;
      
      if (!stockCover[skuId]) {
        const skuName = getSkuName(skuId, b.sku?.name || b.skuName);
        stockCover[skuId] = { sku: { id: skuId, name: skuName }, months: {} };
      }
      if (!stockCover[skuId].months[monthKey]) {
        stockCover[skuId].months[monthKey] = { monthKey, orderItems: [] };
      }
      stockCover[skuId].months[monthKey].budget = b.budgetedQty || 0;
    });
    
    // Process order items
    let skippedOrderItems = 0;
    orderItems.forEach(oi => {
      const skuId = oi.skuId || oi._new_sku_value;
      if (!skuId) {
        skippedOrderItems++;
        logger.warn('Order item missing skuId', { orderItemId: oi.id, orderItem: oi });
        return;
      }
      
      // Derive year and month from date if missing
      let year = oi.year;
      let month = oi.month;
      
      if ((!year || !month) && oi.date) {
        try {
          const dateObj = new Date(oi.date);
          if (!isNaN(dateObj.getTime())) {
            year = year || dateObj.getFullYear();
            month = month || (dateObj.getMonth() + 1); // getMonth() returns 0-11
          }
        } catch (error) {
          logger.warn('Could not parse date to derive year/month', { 
            orderItemId: oi.id, 
            date: oi.date, 
            error: error.message 
          });
        }
      }
      
      // Check if year and month are present after derivation
      if (!year || !month) {
        skippedOrderItems++;
        logger.warn('Order item missing year or month', { 
          orderItemId: oi.id, 
          skuId, 
          year: oi.year, 
          month: oi.month,
          derivedYear: year,
          derivedMonth: month,
          date: oi.date 
        });
        return;
      }
      
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      
      if (!stockCover[skuId]) {
        const skuName = getSkuName(skuId, oi.sku?.name || oi.skuName);
        stockCover[skuId] = { sku: { id: skuId, name: skuName }, months: {} };
      }
      if (!stockCover[skuId].months[monthKey]) {
        stockCover[skuId].months[monthKey] = { monthKey, orderItems: [] };
      }
      stockCover[skuId].months[monthKey].orderItems.push(oi);
    });
    
    if (skippedOrderItems > 0) {
      logger.warn(`Skipped ${skippedOrderItems} order items due to missing skuId, year, or month`, {
        totalOrderItems: orderItems.length,
        skipped: skippedOrderItems,
        countryId
      });
    }
    
    // Process actual inventory to populate historical months with opening/closing stock
    if (actualInventory && actualInventory.length > 0) {
      actualInventory.forEach(inv => {
        const skuId = inv.skuId || inv._new_sku_value;
        if (!skuId || !inv.date) return;
        
        try {
          const dateObj = inv.date instanceof Date ? inv.date : new Date(inv.date);
          if (isNaN(dateObj.getTime())) return;
          
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth() + 1;
          const monthKey = `${year}-${String(month).padStart(2, '0')}`;
          
          // Initialize SKU if it doesn't exist
          if (!stockCover[skuId]) {
            const skuName = getSkuName(skuId, inv.sku?.name);
            stockCover[skuId] = { sku: { id: skuId, name: skuName }, months: {} };
          }
          
          // Initialize month if it doesn't exist
          if (!stockCover[skuId].months[monthKey]) {
            stockCover[skuId].months[monthKey] = { monthKey, orderItems: [] };
          }
          
          // Set actual opening and closing stock from actual inventory
          // Only set if not already set (don't override forecast/budget data)
          const monthData = stockCover[skuId].months[monthKey];
          if (inv.openingStock != null && monthData.actualOpeningStock == null) {
            monthData.actualOpeningStock = inv.openingStock;
          }
          if (inv.closingStock != null && monthData.actualClosingStock == null) {
            monthData.actualClosingStock = inv.closingStock;
          }
        } catch (error) {
          logger.warn('Could not process actual inventory record', { 
            inventoryId: inv.id, 
            error: error.message 
          });
        }
      });
      
      logger.info('Actual inventory merged into stock cover data', {
        countryId,
        actualInventoryRecords: actualInventory.length,
        monthsWithActualInventory: Object.values(stockCover).reduce((sum, sku) => {
          return sum + Object.values(sku.months).filter(m => m.actualOpeningStock != null || m.actualClosingStock != null).length;
        }, 0)
      });
    }
    
    // Process raw aggregated data for past months (actual consumption and actual orders received)
    // Only process months that have actual inventory data
    // Raw aggregated contains actual sales (consumption) and receipts (orders received) by docType
    if (rawAggregated && rawAggregated.length > 0) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Build a set of months that have actual inventory (for filtering)
      const monthsWithActualInventory = new Set();
      Object.values(stockCover).forEach(skuData => {
        Object.keys(skuData.months).forEach(monthKey => {
          const monthData = skuData.months[monthKey];
          if (monthData.actualOpeningStock != null || monthData.actualClosingStock != null) {
            monthsWithActualInventory.add(monthKey);
          }
        });
      });
      
      rawAggregated.forEach(raw => {
        const skuId = raw.skuId || raw._new_sku_value;
        if (!skuId || !raw.date) return;
        
        try {
          const dateObj = raw.date instanceof Date ? raw.date : new Date(raw.date);
          if (isNaN(dateObj.getTime())) return;
          
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth() + 1;
          const monthKey = `${year}-${String(month).padStart(2, '0')}`;
          
          // Only process past months (before current month) that have actual inventory
          const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
          if (!isPastMonth) return;
          
          // Only process if this month has actual inventory data
          if (!monthsWithActualInventory.has(monthKey)) return;
          
          // Ensure SKU and month exist in stockCover
          if (!stockCover[skuId]) {
            const skuName = getSkuName(skuId, raw.sku?.name);
            stockCover[skuId] = { sku: { id: skuId, name: skuName }, months: {} };
          }
          
          if (!stockCover[skuId].months[monthKey]) {
            stockCover[skuId].months[monthKey] = { monthKey, orderItems: [] };
          }
          
          const monthData = stockCover[skuId].months[monthKey];
          
          // Get quantity from raw aggregated - check all possible field names
          // Based on Dataverse schema, the quantity field might be in the name field or a separate quantity field
          let quantity = 0;
          if (raw.quantity != null && raw.quantity !== 0) {
            quantity = Number(raw.quantity);
          } else if (raw.qty != null && raw.qty !== 0) {
            quantity = Number(raw.qty);
          } else if (raw.name && !isNaN(parseFloat(raw.name))) {
            // If name is a number, use it as quantity
            quantity = parseFloat(raw.name);
          } else {
            // Check if there's a quantity field we're missing - log for debugging
            if (rawAggregated.indexOf(raw) < 3) {
              logger.info('Raw aggregated sample record - checking for quantity field', {
                id: raw.id,
                date: raw.date,
                docType: raw.docType,
                channel: raw.channel,
                availableFields: Object.keys(raw),
                allFieldValues: Object.entries(raw).slice(0, 10).map(([k, v]) => ({ [k]: v }))
              });
            }
            return; // Skip if no quantity found
          }
          
          if (quantity === 0 || isNaN(quantity)) return;
          
          // Initialize actual consumption if not set
          if (monthData.actualConsumption == null) {
            monthData.actualConsumption = 0;
          }
          
          // Use docType math from docTypeCalculations to calculate net sales
          // Logic:
          // 1. Get docType from raw aggregated (e.g., "sales", "returns")
          // 2. Look up docTypeSign from docTypeCalculations (e.g., +1 for sales, -1 for returns)
          // 3. Multiply quantity by sign: signedQuantity = quantity * docTypeSign
          //    Example: 100 (sales) * +1 = +100, 50 (returns) * -1 = -50
          // 4. Sum all signedQuantities for the month = net sales (sales - returns)
          //    Example: +100 + (-50) = 50 (net sales)
          // 5. Add net sales to actualConsumption
          const docType = raw.docType;
          const docTypeSign = docTypeSignMap[docType] || 1; // Default to +1 (sales) if not found
          
          // Multiply quantity by sign to get signed quantity
          const signedQuantity = quantity * docTypeSign;
          
          // Add signed quantity to actual consumption (net sales)
          // This accumulates: net sales = sum of (quantity * sign) for all docTypes in the month
          monthData.actualConsumption = (monthData.actualConsumption || 0) + signedQuantity;
        } catch (error) {
          logger.warn('Could not process raw aggregated record', { 
            rawAggregatedId: raw.id, 
            error: error.message 
          });
        }
      });
      
      const monthsWithRawAggregated = Object.values(stockCover).reduce((sum, sku) => {
        return sum + Object.values(sku.months).filter(m => 
          (m.actualConsumption != null && m.actualConsumption > 0) || 
          (m.actualOrdersReceived != null && m.actualOrdersReceived > 0)
        ).length;
      }, 0);
      
      logger.info('Raw aggregated data merged into stock cover data', {
        countryId,
        rawAggregatedRecords: rawAggregated.length,
        monthsWithRawAggregated,
        monthsWithActualInventory: monthsWithActualInventory.size,
        sampleConsumption: Object.values(stockCover).find(sku => 
          Object.values(sku.months).some(m => m.actualConsumption > 0)
        )?.months ? Object.values(Object.values(stockCover).find(sku => 
          Object.values(sku.months).some(m => m.actualConsumption > 0)
        ).months).find(m => m.actualConsumption > 0)?.actualConsumption : null
      });
    }
    
    logger.info('Stock cover data processed', {
      countryId,
      totalOrderItems: orderItems.length,
      skippedOrderItems,
      skusWithData: Object.keys(stockCover).length,
      totalMonths: Object.values(stockCover).reduce((sum, sku) => sum + Object.keys(sku.months).length, 0)
    });
    
    // Calculate metrics if requested
    if (calculateMetrics) {
      return this.calculateStockCover(stockCover, baseStock);
    }
    
    return stockCover;
  }

  /**
   * Sync order items from stockCoverData to OrderItemService
   * This should ONLY be called when order items are created in stockCoverData but don't exist in OrderItemService
   * NOTE: After drag and drop, OrderItemService is already updated, so this sync is NOT needed.
   * The getStockCoverData method already merges order items FROM OrderItemService TO stockCoverData.
   * 
   * @deprecated This method is rarely needed. Use getStockCoverData which automatically merges from OrderItemService.
   */
  async syncOrderItemsToService(countryId) {
    // This method is deprecated - order items should be managed through OrderItemService
    logger.warn('syncOrderItemsToService is deprecated. Order items should be managed through OrderItemService.');
  }

  /**
   * Get all stock cover data
   * Note: This would need to aggregate data for all countries
   * 
   * @param {Array} skus - Optional: Cached SKU data to avoid duplicate fetches
   */
  async getAllStockCoverData(skus = null) {
    const countries = await this.dataverseService.getCountries();
    const results = {};
    
    for (const country of countries) {
      results[country.id] = await this.getStockCoverData(country.id, 0, true, skus);
    }
    
    return results;
  }

  /**
   * Update planned quantity
   * Note: This updates order items, not a separate planned quantity field
   */
  async updatePlannedQty(countryId, skuId, monthKey, newValue) {
    // Parse monthKey (format: YYYY-MM)
    const [year, month] = monthKey.split('-').map(Number);
    
    // Find or create order item for this SKU, country, and month
    const orderItems = await OrderItemService.getOrderItems({ 
      countryId, 
      skuId,
      year,
      month
    });
    
    if (orderItems.length > 0) {
      // Update existing order item
      return OrderItemService.updateOrderItem(orderItems[0].id, {
        orderItemQty: newValue
      });
    } else {
      // Create new order item
      return OrderItemService.createOrderItem({
        countryId,
        skuId,
        orderItemQty: newValue,
        year,
        month,
        date: `${monthKey}-01`,
        orderPlacementStatus: 100000001 // Planned By LO
      });
    }
  }

  /**
   * Recalculate stock cover for a specific month
   * Note: This is a business logic operation that may call Azure Functions
   */
  async recalculateStockCover(countryId, skuId, monthKey) {
    logger.warn('recalculateStockCover: This method should call Azure Function for recalculation');
    // In production, this would call the AutoForecast Azure Function
    return { success: true, message: 'Recalculation triggered' };
  }

  /**
   * Calculate months cover for a SKU/Country
   * Based on Azure Function logic from months-cover-service.js
   * 
   * @param {number} currentStock - Current closing stock
   * @param {Array} futureConsumption - Array of { monthKey, consumption, daysInMonth }
   * @returns {number} - Months cover (e.g., 3.45 means 3 full months + 45% of 4th month)
   */
  calculateMonthsCover(currentStock, futureConsumption) {
    const maxOffset = 12; // Maximum months cover offset
    
    // Handle edge cases
    if (currentStock <= 0) {
      return 0;
    }

    // Filter to only months with consumption
    const validMonths = futureConsumption.filter(m => m.consumption > 0);
    
    if (validMonths.length === 0) {
      return maxOffset;
    }

    // Calculate cumulative consumption for each month
    const cumulativeTable = this.buildCumulativeTable(validMonths);
    
    // Find the last month fully covered by current stock
    const lastFullMonth = this.findLastFullMonth(cumulativeTable, currentStock);
    
    // Calculate result based on whether we have fully covered months
    let monthsCover;
    
    if (lastFullMonth === null) {
      // Stock doesn't even cover the first month fully
      monthsCover = this.calculatePartialFirstMonth(validMonths[0], currentStock);
    } else {
      // Stock covers some full months, calculate fraction of next month
      monthsCover = this.calculateWithFullMonths(
        cumulativeTable, 
        validMonths, 
        lastFullMonth, 
        currentStock
      );
    }

    return Math.round(monthsCover * 100) / 100;  // Round to 2 decimal places
  }

  /**
   * Build cumulative consumption table
   */
  buildCumulativeTable(validMonths) {
    let cumulative = 0;
    return validMonths.map(month => {
      cumulative += month.consumption;
      return {
        ...month,
        cumulativeConsumption: cumulative
      };
    });
  }

  /**
   * Find the last month fully covered by stock
   */
  findLastFullMonth(cumulativeTable, stock) {
    let lastFullMonth = null;
    
    for (const month of cumulativeTable) {
      if (month.cumulativeConsumption <= stock) {
        lastFullMonth = month;
      } else {
        break;
      }
    }
    
    return lastFullMonth;
  }

  /**
   * Calculate months cover when stock doesn't cover first month fully
   */
  calculatePartialFirstMonth(firstMonth, stock) {
    const { consumption, daysInMonth } = firstMonth;
    
    if (consumption <= 0 || daysInMonth <= 0) {
      return 0;
    }
    
    const dailyConsumption = consumption / daysInMonth;
    const daysCovered = stock / dailyConsumption;
    
    return daysCovered / daysInMonth;
  }

  /**
   * Calculate months cover when stock covers some full months
   */
  calculateWithFullMonths(cumulativeTable, validMonths, lastFullMonth, stock) {
    const fullMonthsCount = cumulativeTable.indexOf(lastFullMonth) + 1;
    const remainingStock = stock - lastFullMonth.cumulativeConsumption;
    
    // Find next month after last full month
    const nextMonthIndex = cumulativeTable.findIndex(m => m === lastFullMonth) + 1;
    
    if (nextMonthIndex >= validMonths.length) {
      // No more months, return full months count
      return fullMonthsCount;
    }
    
    const nextMonth = validMonths[nextMonthIndex];
    const partialMonthCover = this.calculatePartialFirstMonth(nextMonth, remainingStock);
    
    return fullMonthsCount + partialMonthCover;
  }

  /**
   * Calculate stock cover metrics for a month
   * @param {Object} monthData - Month data with forecast, budget, orderItems
   * @param {number} openingStock - Opening stock for the month
   * @returns {Object} - Calculated metrics
   */
  calculateMonthMetrics(monthData, openingStock) {
    // Current date for comparison
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Extract year and month from monthKey (format: "YYYY-MM")
    const monthKeyParts = monthData.monthKey.split('-');
    const year = Number(monthKeyParts[0]);
    const month = Number(monthKeyParts[1]);
    
    // Check if this is a past month
    const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
    
    // For past months: use actual consumption from raw aggregated if available
    // For future months: use forecast or budget
    let consumption = 0;
    if (isPastMonth && monthData.actualConsumption != null) {
      consumption = monthData.actualConsumption;
    } else {
      consumption = monthData.forecast || monthData.budget || 0;
    }
    
    // For past months: use actual orders received from raw aggregated if available
    // For future months: use order items
    let inbound = 0;
    if (isPastMonth && monthData.actualOrdersReceived != null) {
      inbound = monthData.actualOrdersReceived;
    } else {
      // Inbound = sum of order items quantities (in cartons)
      inbound = (monthData.orderItems || []).reduce((sum, oi) => {
        // Use qtyCartons if available, otherwise calculate from orderItemQty
        if (oi.qtyCartons != null) {
          return sum + (oi.qtyCartons || 0);
        } else if (oi.orderItemQty != null && oi.sku?.tinsPerCarton) {
          return sum + (oi.orderItemQty / oi.sku.tinsPerCarton);
        }
        return sum;
      }, 0);
    }
    
    // Closing stock = opening stock - consumption + inbound
    const closingStock = openingStock - consumption + inbound;
    
    // Days in month (reuse year and month already declared above)
    const daysInMonth = new Date(year, month, 0).getDate();
    
    return {
      openingStock,
      consumption,
      inbound,
      closingStock: Math.max(0, closingStock), // Don't allow negative
      daysInMonth
    };
  }

  /**
   * Calculate stock cover for all months (with proper chaining)
   * @param {Object} stockCoverData - Stock cover data grouped by SKU
   * @param {number} baseStock - Starting stock
   * @returns {Object} - Stock cover data with calculated metrics
   */
  calculateStockCover(stockCoverData, baseStock = 0) {
    const result = {};
    
    for (const [skuId, skuData] of Object.entries(stockCoverData)) {
      result[skuId] = {
        ...skuData,
        months: {}
      };
      
      // Sort months chronologically
      const sortedMonths = Object.keys(skuData.months).sort();
      
      // Use actual opening stock from the first month if available, otherwise use baseStock
      let currentStock = baseStock;
      if (sortedMonths.length > 0) {
        const firstMonthData = skuData.months[sortedMonths[0]];
        if (firstMonthData.actualOpeningStock != null) {
          currentStock = firstMonthData.actualOpeningStock;
        }
      }
      
      // Build future consumption array for months cover calculation
      const futureConsumption = [];
      
      for (const monthKey of sortedMonths) {
        const monthData = skuData.months[monthKey];
        
        // Use actual opening stock if available, otherwise use currentStock from previous month
        const openingStock = monthData.actualOpeningStock != null ? monthData.actualOpeningStock : currentStock;
        
        // Calculate month metrics
        const metrics = this.calculateMonthMetrics(monthData, openingStock);
        
        // Use actual closing stock if available, otherwise use calculated closing stock
        if (monthData.actualClosingStock != null) {
          metrics.closingStock = monthData.actualClosingStock;
        }
        
        // Update current stock for next month
        currentStock = metrics.closingStock;
        
        // Add to future consumption for months cover
        futureConsumption.push({
          monthKey,
          consumption: metrics.consumption,
          daysInMonth: metrics.daysInMonth
        });
        
        // Store calculated metrics
        result[skuId].months[monthKey] = {
          ...monthData,
          ...metrics
        };
      }
      
      // Calculate months cover for each month (based on closing stock)
      for (const monthKey of sortedMonths) {
        const monthData = result[skuId].months[monthKey];
        const monthIndex = sortedMonths.indexOf(monthKey);
        
        // Get future consumption from this month forward
        const futureFromThisMonth = futureConsumption.slice(monthIndex + 1);
        
        // Calculate months cover based on closing stock
        monthData.monthsCover = this.calculateMonthsCover(monthData.closingStock, futureFromThisMonth);
      }
    }
    
    return result;
  }

  /**
   * Calculate months cover for a specific SKU/Country (calls Azure Function in production)
   * This is a wrapper that should call the Azure Function for full calculation
   */
  async calculateMonthsCoverForSKU(countryId, skuId) {
    logger.warn('calculateMonthsCoverForSKU: This method should call Azure Function for full calculation');
    // In production, this would call the AutoForecast Azure Function
    // For now, return a placeholder
    return { months: 0, message: 'Full calculation requires Azure Function call' };
  }
}

export default new StockCoverService();

