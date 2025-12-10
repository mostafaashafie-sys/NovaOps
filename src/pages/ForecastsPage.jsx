import React, { useState, useEffect } from 'react';
import { useApp } from '../providers/index.js';
import { useForecasts } from '../hooks/index.js';
import { FilterBar, PageHeader, LoadingState, ErrorState } from '../components/index.js';
import { formatNumber } from '../utils/index.js';

/**
 * Forecasts Page Component
 * Forecast management interface
 */
export const ForecastsPage = () => {
  const { data } = useApp();
  const { forecasts, loading, error, filters, setFilters, getForecastsBySKU } = useForecasts({
    countryId: data?.countries[0]?.id || null,
    skuId: null
  });
  const [forecastsBySKU, setForecastsBySKU] = useState({});

  useEffect(() => {
    if (forecasts.length > 0) {
      const grouped = forecasts.reduce((acc, f) => {
        if (!acc[f.skuId]) acc[f.skuId] = { sku: data?.skus.find(s => s.id === f.skuId), months: {} };
        acc[f.skuId].months[f.monthKey] = f;
        return acc;
      }, {});
      setForecastsBySKU(grouped);
    }
  }, [forecasts, data?.skus]);

  if (!data || loading) {
    return <LoadingState message="Loading forecasts..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecast Management</h1>
          <p className="text-gray-500 mt-1">Manage sales forecasts and budgets by SKU and month</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Import Forecast
        </button>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} showDateRange={false} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[200px]">SKU</th>
                <th className="sticky left-[200px] z-20 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[100px]">Type</th>
                {data.months.map(month => (
                  <th key={month.key} className="px-3 py-3 text-right font-semibold text-gray-600 min-w-[80px]">
                    {month.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-gray-600 min-w-[100px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(forecastsBySKU).map(([skuId, skuData]) => (
                <React.Fragment key={skuId}>
                  {['forecastQty', 'budgetQty', 'actualQty'].map((type, idx) => (
                    <tr key={`${skuId}-${type}`} className={`${idx === 0 ? 'border-t-2 border-gray-200' : 'border-t border-gray-50'} hover:bg-gray-50/50`}>
                      <td className="sticky left-0 z-10 bg-white px-4 py-2">
                        {idx === 0 && (
                          <div>
                            <div className="font-semibold text-gray-900">{skuData.sku?.name || skuId}</div>
                            <div className="text-xs text-gray-400">{skuData.sku?.category}</div>
                          </div>
                        )}
                      </td>
                      <td className="sticky left-[200px] z-10 bg-white px-4 py-2">
                        <span className={`text-sm ${type === 'forecastQty' ? 'text-blue-600 font-medium' : type === 'budgetQty' ? 'text-purple-600' : 'text-green-600'}`}>
                          {type === 'forecastQty' ? 'Forecast' : type === 'budgetQty' ? 'Budget' : 'Actual'}
                        </span>
                      </td>
                      {data.months.map(month => {
                        const monthData = skuData.months[month.key];
                        const value = monthData?.[type];
                        return (
                          <td key={month.key} className={`px-3 py-2 text-right ${type === 'forecastQty' ? 'bg-blue-50' : ''}`}>
                            {value !== null && value !== undefined ? formatNumber(value) : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatNumber(Object.values(skuData.months).reduce((sum, m) => sum + (m[type] || 0), 0))}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ForecastsPage;

