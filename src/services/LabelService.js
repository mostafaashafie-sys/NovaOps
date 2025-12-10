import DataverseService from './DataverseService.js';
import MockDataService from './MockDataService.js';
import { DataverseConfig } from '@/config/index.js';

/**
 * Label Service
 * Handles regulatory label management for order items
 */
class LabelService {
  constructor(useMock = true) {
    this.useMock = useMock;
    this.dataverseService = DataverseService;
    this.mockData = useMock ? MockDataService.generateMockData() : null;
  }

  /**
   * Get all labels
   */
  async getLabels(filters = {}) {
    if (this.useMock) {
      // Get labels from mock data
      if (!this.mockData) {
        this.mockData = MockDataService.generateMockData();
      }
      
      let labels = this.mockData.labels || [];

      // Add isActive property if not present
      labels = labels.map(label => ({
        ...label,
        isActive: label.isActive !== undefined ? label.isActive : true
      }));

      let filteredLabels = labels;

      if (filters.countryId) {
        filteredLabels = labels.filter(l => !l.countryId || l.countryId === filters.countryId);
      }

      if (filters.isActive !== undefined) {
        filteredLabels = filteredLabels.filter(l => l.isActive === filters.isActive);
      }

      return filteredLabels;
    }

    return this.dataverseService.fetch(`/${DataverseConfig.tables.labels}`);
  }

  /**
   * Get label by ID
   */
  async getLabelById(labelId) {
    if (this.useMock) {
      const labels = await this.getLabels();
      return labels.find(l => l.id === labelId) || null;
    }

    return this.dataverseService.fetch(`/${DataverseConfig.tables.labels}(${labelId})`);
  }

  /**
   * Get labels for a specific country
   */
  async getLabelsByCountry(countryId) {
    return this.getLabels({ countryId, isActive: true });
  }
}

export default new LabelService(true); // Use mock by default

