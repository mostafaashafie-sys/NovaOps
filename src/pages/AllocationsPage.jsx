import React from 'react';
import { useApp } from '../providers/index.js';
import { useAllocations } from '../hooks/index.js';
import { FilterBar, StatusBadge, PageHeader, LoadingState, ErrorState } from '../components/index.js';
import { formatNumber } from '../utils/index.js';

/**
 * Allocations Page Component
 */
export const AllocationsPage = () => {
  const { data } = useApp();
  const { allocations, loading, error, filters, setFilters } = useAllocations();

  if (!data || loading) {
    return <LoadingState message="Loading allocations..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Allocation Management" 
        description="Manage and move inventory allocations"
      />

      <FilterBar filters={filters} onFilterChange={setFilters} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Allocation ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Order</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Country</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Allocated Qty</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map(allocation => (
              <tr key={allocation.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{allocation.id}</td>
                <td className="px-4 py-3 text-blue-600">{allocation.orderId}</td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{allocation.skuId}</div>
                    <div className="text-xs text-gray-400">{allocation.skuName}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{allocation.countryName}</td>
                <td className="px-4 py-3 text-right font-medium">{formatNumber(allocation.allocatedQty)}</td>
                <td className="px-4 py-3"><StatusBadge status={allocation.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllocationsPage;

