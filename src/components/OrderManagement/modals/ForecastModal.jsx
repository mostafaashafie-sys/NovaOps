import { Modal } from '@/components/index.js';

/**
 * Forecast Modal Component
 * Creates or updates forecast data
 */
export const ForecastModal = ({
  isOpen,
  onClose,
  countryId,
  skuId,
  monthKey,
  data,
  relatedForecast,
  onUpdateForecast
}) => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await onUpdateForecast({
        forecastQty: parseInt(formData.get('forecastQty')),
        budgetQty: parseInt(formData.get('budgetQty')),
        actualQty: formData.get('actualQty') ? parseInt(formData.get('actualQty')) : null
      });
      onClose();
    } catch (err) {
      showMessage.error(err.message);
    }
  };

  if (!(countryId && skuId && monthKey)) {
    return (
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Create/Update Forecast" 
        size="md"
      >
        <div className="text-center py-8 text-gray-500">
          <p>No context selected for forecast</p>
          <p className="text-sm mt-2">Please select a country, SKU, and month</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={relatedForecast ? `Update Forecast: ${monthKey}` : `Create Forecast: ${monthKey}`} 
      size="md"
    >
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
        <div className="text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Country:</span>
            <span className="font-semibold">{data?.countries?.find(c => c.id === countryId)?.name || countryId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">SKU:</span>
            <span className="font-semibold">{data?.skus?.find(s => s.id === skuId)?.name || skuId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Month:</span>
            <span className="font-semibold">{data?.months?.find(m => m.key === monthKey)?.label || monthKey}</span>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Quantity *</label>
          <input
            type="number"
            name="forecastQty"
            defaultValue={relatedForecast?.forecastQty || ''}
            required
            min="0"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Budget Quantity *</label>
          <input
            type="number"
            name="budgetQty"
            defaultValue={relatedForecast?.budgetQty || ''}
            required
            min="0"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Actual Quantity</label>
          <input
            type="number"
            name="actualQty"
            defaultValue={relatedForecast?.actualQty || ''}
            min="0"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md"
          >
            {relatedForecast ? 'Update' : 'Create'} Forecast
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ForecastModal;

