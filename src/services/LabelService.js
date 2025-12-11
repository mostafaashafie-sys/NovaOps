import DataverseDataService from './DataverseDataService.js';

/**
 * Label Service
 * Handles regulatory label management for order items
 */
class LabelService {
  constructor() {
    this.dataverseService = DataverseDataService;
  }

  /**
   * Get all labels
   */
  async getLabels(filters = {}) {
    return this.dataverseService.getLabels(filters);
  }

  /**
   * Get label by ID
   */
  async getLabelById(labelId) {
    return this.dataverseService.getLabelById(labelId);
  }

  /**
   * Get labels for a specific country
   */
  async getLabelsByCountry(countryId) {
    return this.getLabels({ countryId });
  }

  /**
   * Create a new label
   */
  async createLabel(labelData) {
    return this.dataverseService.createLabel(labelData);
  }

  /**
   * Update a label
   */
  async updateLabel(labelId, updates) {
    return this.dataverseService.updateLabel(labelId, updates);
  }

  /**
   * Delete a label
   */
  async deleteLabel(labelId) {
    return this.dataverseService.deleteLabel(labelId);
  }
}

export default new LabelService();

