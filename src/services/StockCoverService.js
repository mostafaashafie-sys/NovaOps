import DataverseService from './DataverseService.js';
import MockDataService from './MockDataService.js';
import OrderItemService from './OrderItemService.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('StockCoverService');

/**
 * Stock Cover Service
 * Handles stock cover calculations and data management
 */
class StockCoverService {
  constructor(useMock = true) {
    this.useMock = useMock;
    this.dataverseService = DataverseService;
    this.mockData = useMock ? MockDataService.generateMockData() : null;
  }

  /**
   * Get stock cover data for a country
   * Merges order items from OrderItemService into stock cover data
   */
  async getStockCoverData(countryId) {
    if (this.useMock) {
      // Create a deep copy to avoid mutating the original
      const stockCover = JSON.parse(JSON.stringify(this.mockData.stockCoverData[countryId] || {}));
      
      // Merge order items from OrderItemService into stock cover data
      try {
        // Get order items from OrderItemService (includes newly created/updated ones)
        const allOrderItems = await OrderItemService.getOrderItems({ countryId });
        
        // Group order items by SKU and month, then merge into stock cover data
        Object.keys(stockCover).forEach(skuId => {
          const skuData = stockCover[skuId];
          if (!skuData.months) return; // Skip if no months data
          
          Object.keys(skuData.months).forEach(monthKey => {
            const monthData = skuData.months[monthKey];
            
            // Get order items for this SKU and month
            const relevantOrderItems = allOrderItems.filter(oi => 
              oi.skuId === skuId && oi.deliveryMonth === monthKey
            );
            
            // Replace with order items from OrderItemService (more up-to-date, includes newly created ones)
            if (relevantOrderItems.length > 0) {
              monthData.orderItems = relevantOrderItems;
            } else if (!monthData.orderItems) {
              monthData.orderItems = [];
            }
          });
        });
      } catch (err) {
        logger.error('Error merging order items into stock cover', err);
      }
      
      return stockCover;
    }
    
    // In production, this would fetch from Dataverse and calculate
    return {};
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
    if (!this.useMock) return;
    
    try {
      const stockCover = this.mockData.stockCoverData[countryId] || {};
      const allStockCoverOrderItems = [];
      
      Object.keys(stockCover).forEach(skuId => {
        const skuData = stockCover[skuId];
        if (!skuData.months) return;
        
        Object.keys(skuData.months).forEach(monthKey => {
          const monthData = skuData.months[monthKey];
          if (monthData.orderItems && monthData.orderItems.length > 0) {
            allStockCoverOrderItems.push(...monthData.orderItems);
          }
        });
      });
      
      // Sync to OrderItemService's mockData
      const orderItemServiceInstance = OrderItemService;
      if (orderItemServiceInstance && orderItemServiceInstance.useMock && orderItemServiceInstance.mockData) {
        if (!orderItemServiceInstance.mockData.orderItems) {
          orderItemServiceInstance.mockData.orderItems = [];
        }
        
        // Only sync valid order items (must have id starting with 'OI-')
        // Filter out PO IDs and other invalid entries
        const validOrderItems = allStockCoverOrderItems.filter(oi => 
          oi && 
          oi.id && 
          typeof oi.id === 'string' && 
          oi.id.startsWith('OI-') &&
          oi.skuId &&
          oi.countryId
        );
        
        // Add order items that don't exist in OrderItemService
        let addedCount = 0;
        let updatedCount = 0;
        
        validOrderItems.forEach(oi => {
          const exists = orderItemServiceInstance.mockData.orderItems.find(existing => existing.id === oi.id);
          if (!exists) {
            orderItemServiceInstance.mockData.orderItems.push(oi);
            addedCount++;
          } else {
            // Only update if there are actual differences (avoid unnecessary updates)
            const hasChanges = JSON.stringify(exists) !== JSON.stringify(oi);
            if (hasChanges) {
              Object.assign(exists, oi);
              updatedCount++;
            }
          }
        });
        
        if (addedCount > 0 || updatedCount > 0) {
          logger.data('Sync complete', { 
            added: addedCount, 
            updated: updatedCount,
            total: orderItemServiceInstance.mockData.orderItems.length 
          });
        }
      }
    } catch (err) {
      logger.error('Error syncing order items', err);
    }
  }

  /**
   * Get all stock cover data
   */
  async getAllStockCoverData() {
    if (this.useMock) {
      return this.mockData.stockCoverData;
    }
    
    return {};
  }

  /**
   * Update planned quantity
   */
  async updatePlannedQty(countryId, skuId, monthKey, newValue) {
    if (this.useMock) {
      if (this.mockData.stockCoverData[countryId]?.[skuId]?.months[monthKey]) {
        this.mockData.stockCoverData[countryId][skuId].months[monthKey].plannedQty = newValue;
        // Recalculate closing stock and months cover
        this.recalculateStockCover(countryId, skuId, monthKey);
      }
      return this.mockData.stockCoverData[countryId]?.[skuId]?.months[monthKey];
    }
    
    // In production, update in Dataverse
    return null;
  }

  /**
   * Recalculate stock cover for a specific month
   */
  recalculateStockCover(countryId, skuId, monthKey) {
    if (!this.useMock) return;
    
    const monthData = this.mockData.stockCoverData[countryId]?.[skuId]?.months[monthKey];
    if (!monthData) return;
    
    // Get previous month's closing stock
    const months = this.mockData.months;
    const currentMonthIndex = months.findIndex(m => m.key === monthKey);
    const prevMonth = months[currentMonthIndex - 1];
    
    if (prevMonth) {
      const prevMonthData = this.mockData.stockCoverData[countryId]?.[skuId]?.months[prevMonth.key];
      monthData.openingStock = prevMonthData?.closingStock || monthData.openingStock;
    }
    
    // Recalculate closing stock
    monthData.closingStock = monthData.openingStock + 
      (monthData.confirmedOrderQty || 0) + 
      (monthData.plannedQty || 0) - 
      monthData.consumption;
    
    // Recalculate months cover
    const avgConsumption = monthData.consumption || 1;
    monthData.monthsCover = Math.max(0, monthData.closingStock / avgConsumption);
  }

  /**
   * Calculate months cover (calls Azure Function in production)
   */
  async calculateMonthsCover(countryId, skuId) {
    if (this.useMock) {
      return this.dataverseService.calculateMonthsCover(countryId, skuId);
    }
    
    return this.dataverseService.calculateMonthsCover(countryId, skuId);
  }
}

export default new StockCoverService(true); // Use mock by default

