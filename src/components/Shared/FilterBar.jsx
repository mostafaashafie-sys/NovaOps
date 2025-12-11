import { useApp } from '@/providers/index.js';
import { useSkusByCountry } from '@/hooks/index.js';
import { DatePicker } from '@/components/index.js';

/**
 * Filter Bar Component
 * Reusable filter controls for tables and lists
 * When a country is selected, only shows SKUs assigned to that country
 */
export const FilterBar = ({ filters, onFilterChange, showSKU = true, showDateRange = true }) => {
  const { data } = useApp();
  // Get SKUs filtered by country assignment when country is selected
  const { skus: filteredSkus } = useSkusByCountry(filters.countryId || null);
  
  // Use filtered SKUs when country is selected, otherwise use all SKUs
  const skusToDisplay = filters.countryId ? filteredSkus : (data?.skus || []);
  
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">Country</label>
        <select
          value={filters.countryId || ''}
          onChange={(e) => onFilterChange({ ...filters, countryId: e.target.value || null })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Countries</option>
          {data?.countries.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      
      {showSKU && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">SKU</label>
          <select
            value={filters.skuId || ''}
            onChange={(e) => onFilterChange({ ...filters, skuId: e.target.value || null })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All SKUs</option>
            {skusToDisplay.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      
      {showDateRange && (
        <>
          <DatePicker
            label="From"
            value={filters.fromDate || ''}
            onChange={(value) => onFilterChange({ ...filters, fromDate: value || null })}
            className="w-auto min-w-[180px]"
          />
          <DatePicker
            label="To"
            value={filters.toDate || ''}
            onChange={(value) => onFilterChange({ ...filters, toDate: value || null })}
            min={filters.fromDate || undefined}
            className="w-auto min-w-[180px]"
          />
        </>
      )}
      
      <button
        onClick={() => onFilterChange({ countryId: null, skuId: null, fromDate: null, toDate: null })}
        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );
};

export default FilterBar;

