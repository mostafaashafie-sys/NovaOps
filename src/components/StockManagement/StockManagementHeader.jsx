/**
 * Stock Management Page Header
 * Displays title, country selector, unit toggle, and export button
 */
export const StockManagementHeader = ({ 
  selectedCountry, 
  onCountryChange, 
  countries,
  unitDisplay,
  onUnitDisplayChange
}) => {
  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage stock levels and plan orders</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            {countries?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          {/* Unit Toggle: Cartons (default) / Tins */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onUnitDisplayChange('cartons')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                unitDisplay === 'cartons'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cartons
            </button>
            <button
              onClick={() => onUnitDisplayChange('tins')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                unitDisplay === 'tins'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tins
            </button>
          </div>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

