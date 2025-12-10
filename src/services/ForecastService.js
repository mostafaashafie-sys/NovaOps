import DataverseService from './DataverseService.js';
import MockDataService from './MockDataService.js';

/**
 * Forecast Service
 * Handles all forecast-related business logic and API calls
 */
class ForecastService {
  constructor(useMock = true) {
    this.useMock = useMock;
    this.dataverseService = DataverseService;
    this.mockData = useMock ? MockDataService.generateMockData() : null;
  }

  /**
   * Get forecasts with optional filters
   */
  async getForecasts(filters = {}) {
    if (this.useMock) {
      let forecasts = this.mockData.forecasts;
      
      if (filters.countryId) {
        forecasts = forecasts.filter(f => f.countryId === filters.countryId);
      }
      if (filters.skuId) {
        forecasts = forecasts.filter(f => f.skuId === filters.skuId);
      }
      if (filters.year) {
        forecasts = forecasts.filter(f => f.year === parseInt(filters.year));
      }
      
      return forecasts;
    }
    
    return this.dataverseService.getForecasts(filters);
  }

  /**
   * Update forecast
   */
  async updateForecast(forecastId, data) {
    if (this.useMock) {
      const forecast = this.mockData.forecasts.find(f => f.id === forecastId);
      if (forecast) {
        Object.assign(forecast, data);
      }
      return forecast;
    }
    
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

export default new ForecastService(true); // Use mock by default

