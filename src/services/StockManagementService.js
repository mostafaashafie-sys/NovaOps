import DataverseDataService from './DataverseDataService.js';
import OrderItemService from './OrderItemService.js';
import StockCalculationService from './StockCalculationService.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('StockManagementService');

/**
 * Stock Management Service
 * Handles stock cover data fetching and calculation using CalculationOrchestrator
 * Uses CalculationOrchestrator for optimized batch measure calculations
 */
class StockManagementService {
  constructor() {
    this.dataverseService = DataverseDataService;
  }

  /**
   * Get stock cover data for a country
   * Uses CalculationOrchestrator for optimized batch calculations
   */
  async getStockCoverData(countryId, baseStock = 0, calculateMetrics = true, skus = null) {
    logger.info('Fetching stock cover data using CalculationOrchestrator', { countryId, calculateMetrics });
    
    try {
      // Fetch all required data in parallel
      const [forecasts, budgets, orderItems, actualInventory, procurementSafeMargins] = await Promise.all([
        this.dataverseService.getForecasts({ countryId }),
        this.dataverseService.getBudgets({ countryId }),
        OrderItemService.getOrderItems({ countryId }),
        this.dataverseService.getActualInventory({ countryId }),
        this.dataverseService.getProcurementSafeMargin({ countryId })
      ]);

      // Get filtered SKUs
      const filteredSkus = await this.getFilteredSkus(countryId, skus);
      const skuMap = this.buildSkuMap(filteredSkus);
      
      // Get procurement safe margin
      const procurementSafeMargin = this.extractProcurementSafeMargin(procurementSafeMargins);

      // Build initial stock cover structure
      let stockCover;
      try {
        stockCover = this.buildStockCoverStructure(filteredSkus, forecasts, budgets, orderItems, actualInventory, skuMap);
      } catch (error) {
        logger.error('Error in buildStockCoverStructure', error, { countryId });
        throw error;
      }

    // Calculate metrics using CalculationOrchestrator if requested
    if (calculateMetrics) {
      logger.info('Calculating metrics using CalculationOrchestrator', { 
        countryId, 
        skuCount: Object.keys(stockCover).length,
        procurementSafeMargin 
      });
      const result = await this.calculateStockCoverWithEngine(stockCover, baseStock, procurementSafeMargin, countryId);
      return result;
    }

    logger.info('Returning stock cover data without calculations', { countryId });
    return stockCover;
    } catch (error) {
      logger.error('Error in getStockCoverData', error, { countryId });
      throw error;
    }
  }

  /**
   * Get filtered SKUs for a country
   */
  async getFilteredSkus(countryId, cachedSkus = null) {
    let allSkus = cachedSkus;
    
    if (!allSkus) {
      allSkus = await this.dataverseService.getSkus();
    }

    if (!countryId || !allSkus) {
      return allSkus || [];
    }

    try {
      const assignments = await this.dataverseService.getSkuCountryAssignments({ countryId });
      const assignedSkuIds = new Set();
      
      assignments.forEach(assignment => {
        const skuId = assignment.new_SKU?.new_skutableid || assignment.sku?.id || assignment.skuId || assignment._new_sku_value;
        if (skuId) assignedSkuIds.add(skuId);
      });

      if (assignedSkuIds.size === 0) {
        logger.warn('No SKU country assignments found', { countryId });
        return [];
      }

      const normalizeGuid = (guid) => String(guid || '').toLowerCase().trim();
      const normalizedAssignedSkuIds = new Set(Array.from(assignedSkuIds).map(normalizeGuid));
      
      const filtered = allSkus.filter(sku => {
        const normalizedSkuId = normalizeGuid(sku.id);
        return normalizedAssignedSkuIds.has(normalizedSkuId);
      });
      
      logger.debug('Filtered SKUs for country', {
        countryId,
        totalSkus: allSkus.length,
        assignedSkuIdsCount: assignedSkuIds.size,
        filteredCount: filtered.length,
        sampleFilteredSkuIds: filtered.slice(0, 3).map(s => s.id)
      });
      
      return filtered;
    } catch (error) {
      logger.warn('Error filtering SKUs', { countryId, error: error.message });
      return allSkus;
    }
  }

  /**
   * Build SKU map for name lookup
   */
  buildSkuMap(skus) {
    return (skus || []).reduce((acc, sku) => {
      acc[sku.id] = sku.name;
      return acc;
    }, {});
  }

  /**
   * Extract procurement safe margin
   */
  extractProcurementSafeMargin(procurementSafeMargins) {
    if (procurementSafeMargins && procurementSafeMargins.length > 0 && procurementSafeMargins[0].margin != null) {
      return Number(procurementSafeMargins[0].margin);
    }
    return 1.0;
  }

  /**
   * Build initial stock cover structure from raw data
   */
  buildStockCoverStructure(filteredSkus, forecasts, budgets, orderItems, actualInventory, skuMap) {
    const stockCover = {};

    // Initialize all SKUs
    filteredSkus.forEach(sku => {
      if (sku.id && !stockCover[sku.id]) {
        stockCover[sku.id] = {
          sku: { id: sku.id, name: sku.name || skuMap[sku.id] || 'Unknown SKU' },
          months: {}
        };
      }
    });

    // Normalize GUIDs for consistent matching
    const normalizeGuid = (guid) => String(guid || '').toLowerCase().trim();
    const filteredSkuIdMap = new Map(filteredSkus.map(sku => [normalizeGuid(sku.id), sku.id]));
    
    // Process forecasts
    let forecastsProcessed = 0;
    let forecastsMatched = 0;
    let forecastsNoMatch = 0;
    forecasts.forEach(f => {
      const rawSkuId = f.skuId || f._new_sku_value || f.sku?.id;
      if (!rawSkuId) return;
      forecastsProcessed++;
      
      // Use normalized ID to find matching SKU from filtered list
      const normalizedSkuId = normalizeGuid(rawSkuId);
      const skuId = filteredSkuIdMap.get(normalizedSkuId);
      
      // Only process if SKU is in filtered list
      if (!skuId) {
        forecastsNoMatch++;
        return;
      }
      forecastsMatched++;
      
      const monthKey = `${f.year}-${String(f.month).padStart(2, '0')}`;
      this.ensureMonth(stockCover, skuId, skuMap, f.sku?.name);
      if (!stockCover[skuId].months[monthKey]) {
        stockCover[skuId].months[monthKey] = {};
      }
      stockCover[skuId].months[monthKey].forecast = f.forecastQty || 0;
    });

    // Process budgets
    budgets.forEach(b => {
      const rawSkuId = b.skuId || b._new_sku_value || b.sku?.id;
      if (!rawSkuId) return;
      
      // Use normalized ID to find matching SKU from filtered list
      const normalizedSkuId = normalizeGuid(rawSkuId);
      const skuId = filteredSkuIdMap.get(normalizedSkuId);
      
      // Only process if SKU is in filtered list
      if (!skuId) return;
      
      const monthKey = `${b.year}-${String(b.month).padStart(2, '0')}`;
      this.ensureMonth(stockCover, skuId, skuMap, b.sku?.name);
      if (!stockCover[skuId].months[monthKey]) {
        stockCover[skuId].months[monthKey] = {};
      }
      stockCover[skuId].months[monthKey].budget = b.budgetedQty || 0;
    });

    // Process order items
    orderItems.forEach(oi => {
      const rawSkuId = oi.skuId || oi._new_sku_value || oi.sku?.id;
      if (!rawSkuId) return;
      
      // Use normalized ID to find matching SKU from filtered list
      const normalizedSkuId = normalizeGuid(rawSkuId);
      const skuId = filteredSkuIdMap.get(normalizedSkuId);
      
      // Only process if SKU is in filtered list
      if (!skuId) return;
      
      const { year, month } = this.extractYearMonth(oi);
      if (!year || !month) return;
      
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      this.ensureMonth(stockCover, skuId, skuMap, oi.sku?.name);
      if (!stockCover[skuId].months[monthKey]) {
        stockCover[skuId].months[monthKey] = {};
      }
      
      if (!stockCover[skuId].months[monthKey].orderItems) {
        stockCover[skuId].months[monthKey].orderItems = [];
      }
      stockCover[skuId].months[monthKey].orderItems.push(oi);
    });

    // Process actual inventory
    actualInventory.forEach(inv => {
      const rawSkuId = inv.skuId || inv._new_sku_value || inv.sku?.id;
      if (!rawSkuId || !inv.date) return;
      
      // Use normalized ID to find matching SKU from filtered list
      const normalizedSkuId = normalizeGuid(rawSkuId);
      const skuId = filteredSkuIdMap.get(normalizedSkuId);
      
      // Only process if SKU is in filtered list
      if (!skuId) return;
      
      const { year, month } = this.extractYearMonthFromDate(inv.date);
      if (!year || !month) return;
      
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      this.ensureMonth(stockCover, skuId, skuMap, inv.sku?.name);
      if (!stockCover[skuId].months[monthKey]) {
        stockCover[skuId].months[monthKey] = {};
      }
      
      const monthData = stockCover[skuId].months[monthKey];
      if (inv.openingStock != null) monthData.actualOpeningStock = inv.openingStock;
      if (inv.closingStock != null) monthData.actualClosingStock = inv.closingStock;
    });

    return stockCover;
  }

  /**
   * Ensure month entry exists for SKU
   */
  ensureMonth(stockCover, skuId, skuMap, fallbackName) {
    if (!stockCover[skuId]) {
      stockCover[skuId] = {
        sku: { id: skuId, name: skuMap[skuId] || fallbackName || skuId },
        months: {}
      };
    }
  }

  /**
   * Extract year and month from order item
   */
  extractYearMonth(orderItem) {
    let year = orderItem.year;
    let month = orderItem.month;
    
    if ((!year || !month) && orderItem.date) {
      const dateObj = new Date(orderItem.date);
      if (!isNaN(dateObj.getTime())) {
        year = year || dateObj.getFullYear();
        month = month || (dateObj.getMonth() + 1);
      }
    }
    
    return { year, month };
  }

  /**
   * Extract year and month from date
   */
  extractYearMonthFromDate(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return { year: null, month: null };
    
    return {
      year: dateObj.getFullYear(),
      month: dateObj.getMonth() + 1
    };
  }

  /**
   * Calculate stock cover using CalculationOrchestrator
   */
  async calculateStockCoverWithEngine(stockCoverData, baseStock = 0, procurementSafeMargin = 1.0, countryId = null) {
    const result = {};
    const totalSkus = Object.keys(stockCoverData).length;
    let processedSkus = 0;
    
    logger.debug('Starting CalculationOrchestrator-based stock cover calculation', {
      countryId,
      totalSkus,
      baseStock,
      procurementSafeMargin
    });
    
    for (const [skuId, skuData] of Object.entries(stockCoverData)) {
      result[skuId] = { ...skuData, months: {} };
      
      const sortedMonths = Object.keys(skuData.months).sort();
      let currentStock = baseStock;
      
      // Get initial stock from first month if available
      if (sortedMonths.length > 0) {
        const firstMonthData = skuData.months[sortedMonths[0]];
        if (firstMonthData.actualOpeningStock != null) {
          currentStock = firstMonthData.actualOpeningStock;
        }
      }
      
      // Calculate metrics for each month using CalculationOrchestrator
      for (const monthKey of sortedMonths) {
        const monthData = skuData.months[monthKey];
        const [year, month] = monthKey.split('-').map(Number);
        const context = { countryId, skuId, year, month, monthKey };
        const filters = {};
        
        try {
          // Use actual opening stock if available, otherwise use currentStock
          const openingStock = monthData.actualOpeningStock != null ? monthData.actualOpeningStock : currentStock;
          
          // Calculate all measures using CalculationOrchestrator batch execution
          // Build list of measures to calculate
          const measuresToCalculate = ['issuesFromStock', 'closingStock', 'netSales', 'ed'];
          if (monthData.budget > 0) {
            measuresToCalculate.push('budgetAchievement');
          }
          
          // Use batch execution for optimized dependency resolution
          const batchResults = await StockCalculationService.executeBatch(measuresToCalculate, filters, context);
          
          // Extract results with fallback to monthData
          const issuesFromStock = batchResults.issuesFromStock ?? monthData.issuesFromStock ?? 0;
          const closingStock = batchResults.closingStock ?? monthData.closingStock ?? 0;
          const netSales = batchResults.netSales ?? monthData.netSales ?? 0;
          const ed = batchResults.ed ?? monthData.ed ?? 0;
          const budgetAchievement = monthData.budget > 0 ? (batchResults.budgetAchievement ?? null) : null;
          
          // Calculate inbound from order items
          const inbound = (monthData.orderItems || []).reduce((sum, oi) => {
            return sum + (oi.qtyCartons || (oi.orderItemQty && oi.sku?.tinsPerCarton ? oi.orderItemQty / oi.sku.tinsPerCarton : 0) || 0);
          }, 0);
          
          // Calculate months cover
          const monthsCover = await this.calculateMonthsCoverForMonth(
            closingStock,
            sortedMonths,
            sortedMonths.indexOf(monthKey),
            result[skuId].months,
            context
          );
          
          // Store calculated metrics
          result[skuId].months[monthKey] = {
            ...monthData,
            openingStock,
            consumption: issuesFromStock || 0,
            inbound,
            closingStock: monthData.actualClosingStock != null ? monthData.actualClosingStock : closingStock,
            daysInMonth: new Date(year, month, 0).getDate(),
            issuesFromStock,
            netSales,
            ed,
            budgetAchievement,
            monthsCover
          };
          
          currentStock = result[skuId].months[monthKey].closingStock;
        } catch (error) {
          logger.error('Error calculating metrics for month using CalculationOrchestrator', error, { 
            skuId, 
            monthKey,
            countryId,
            year,
            month
          });
          // Fallback to basic calculation
          result[skuId].months[monthKey] = {
            ...monthData,
            openingStock: monthData.actualOpeningStock != null ? monthData.actualOpeningStock : currentStock,
            consumption: 0,
            inbound: 0,
            closingStock: monthData.actualClosingStock != null ? monthData.actualClosingStock : currentStock,
            daysInMonth: new Date(year, month, 0).getDate()
          };
          currentStock = result[skuId].months[monthKey].closingStock;
        }
      }
      
      processedSkus++;
      // Log progress every 10 SKUs
      if (processedSkus % 10 === 0) {
        logger.debug('Stock cover calculation progress', {
          countryId,
          processedSkus,
          totalSkus,
          percentComplete: Math.round((processedSkus / totalSkus) * 100)
        });
      }
    }
    
    const totalMonths = Object.values(result).reduce((sum, sku) => sum + Object.keys(sku.months || {}).length, 0);
    logger.info('Stock cover calculation completed using CalculationOrchestrator', {
      countryId,
      totalSkus: processedSkus,
      totalMonths
    });
    
    return result;
  }


  /**
   * Calculate months cover for a specific month using already-calculated values
   * Uses fast calculation to avoid recalculating issuesFromStock for future months
   */
  async calculateMonthsCoverForMonth(closingStock, sortedMonths, monthIndex, monthsData, context) {
    // Use fast calculation directly - we already have issuesFromStock calculated for each month
    // This avoids recalculating issuesFromStock for future months (which would trigger dependency cascade)
    const futureIssues = sortedMonths.slice(monthIndex + 1).map(futureMonthKey => {
      const futureMonthData = monthsData[futureMonthKey];
      // Use already-calculated issuesFromStock if available, otherwise use consumption
      return {
        monthKey: futureMonthKey,
        issues: futureMonthData?.issuesFromStock ?? futureMonthData?.consumption ?? 0
      };
    });
    
    const monthsCover = StockCalculationService.calculateMonthsCoverFast(closingStock, futureIssues);
    logger.debug('Calculated monthsCover using fast calculation', {
      monthsCover,
      closingStock,
      futureMonthsCount: futureIssues.length,
      ...context
    });
    return monthsCover;
  }

  /**
   * Update planned quantity
   */
  async updatePlannedQty(countryId, skuId, monthKey, newValue) {
    const [year, month] = monthKey.split('-').map(Number);
    
    const orderItems = await OrderItemService.getOrderItems({ countryId, skuId, year, month });
    
    if (orderItems.length > 0) {
      return OrderItemService.updateOrderItem(orderItems[0].id, { orderItemQty: newValue });
    } else {
      return OrderItemService.createOrderItem({
        countryId,
        skuId,
        orderItemQty: newValue,
        year,
        month,
        date: `${monthKey}-01`,
        orderPlacementStatus: 100000001
      });
    }
  }

  /**
   * Get all stock cover data for all countries
   */
  async getAllStockCoverData(skus = null) {
    const countries = await this.dataverseService.getCountries();
    const results = {};
    
    for (const country of countries) {
      results[country.id] = await this.getStockCoverData(country.id, 0, true, skus);
    }
    
    return results;
  }

}

export default new StockManagementService();
