import { DataverseService, MockDataService } from './index.js';

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
   */
  async getStockCoverData(countryId) {
    if (this.useMock) {
      return this.mockData.stockCoverData[countryId] || {};
    }
    
    // In production, this would fetch from Dataverse and calculate
    return {};
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

