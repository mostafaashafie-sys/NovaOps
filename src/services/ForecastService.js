import DataverseDataService from './DataverseDataService.js';

/**
 * Forecast Service
 * Handles all forecast-related business logic and API calls
 */
class ForecastService {
  constructor() {
    this.dataverseService = DataverseDataService;
  }

  /**
   * Get forecasts with optional filters
   */
  async getForecasts(filters = {}) {
    return this.dataverseService.getForecasts(filters);
  }

  /**
   * Update forecast
   */
  async updateForecast(forecastId, data) {
    return this.dataverseService.updateForecast(forecastId, data);
  }

  /**
   * Get forecasts grouped by SKU
   */
  async getForecastsBySKU(filters = {}) {
    const forecasts = await this.getForecasts(filters);
    const grouped = {};
    
    forecasts.forEach(f => {
      if (!grouped[f.skuId]) {
        grouped[f.skuId] = { sku: { id: f.skuId, name: f.skuName }, months: {} };
      }
      grouped[f.skuId].months[f.monthKey] = f;
    });
    
    return grouped;
  }
}

export default new ForecastService();

