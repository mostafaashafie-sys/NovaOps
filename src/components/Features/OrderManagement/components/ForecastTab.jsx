import React from 'react';
import { formatNumber } from '../../../utils/index.js';

/**
 * Forecast Tab Component
 * Displays forecast information and actions
 */
export const ForecastTab = ({ forecast, onCreate, onUpdate }) => {
  if (!forecast) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">📈</div>
        <p className="font-medium mb-2">No forecast found</p>
        <p className="text-sm mb-4">No forecast exists for this period</p>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Forecast
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Forecast Information</h3>
        <div className="space-y-3 text-sm mb-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Forecast Qty:</span>
            <span className="font-semibold">{formatNumber(forecast.forecastQty)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Budget Qty:</span>
            <span className="font-semibold">{formatNumber(forecast.budgetQty)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-600">Actual Qty:</span>
            <span className="font-semibold">
              {forecast.actualQty ? formatNumber(forecast.actualQty) : '—'}
            </span>
          </div>
        </div>
        <button
          onClick={onUpdate}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Update Forecast
        </button>
      </div>
    </div>
  );
};

export default ForecastTab;

