import { useState, useEffect, useMemo, Fragment } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useApp } from '@/providers/index.js';
import { useStockCover, useOrderItems, useOrderItemDragDrop, useScrollManagement, useSkusByCountry } from '@/hooks/index.js';
import { OrderManagementPanel } from '@/components/index.js';
import { 
  StockManagementHeader, 
  MonthHeaderRow, 
  StockCoverRow
} from '@/components/StockManagement/index.js';
import ReactCountryFlag from 'react-country-flag';
import { LoadingState } from '@/components/index.js';
import { DataverseDataService } from '@/services/index.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('StockManagementPage');

/**
 * Stock Management Page
 * Interactive table for managing stock cover and planning quantities
 */
export const StockManagementPage = ({ onCreateOrder, onViewOrder }) => {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  const { data } = useApp();
  const queryClient = useQueryClient();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [unitDisplay, setUnitDisplay] = useState('cartons'); // Default: cartons
  const { stockCoverData, loading: stockCoverLoading, refresh: refreshStockCover } = useStockCover(selectedCountry);
  const { refresh: refreshOrderItems } = useOrderItems();
  // Get SKUs filtered by country assignment
  const { skus: filteredSkus } = useSkusByCountry(selectedCountry);
  
  // Create a map of SKU IDs to tinsPerCarton for unit conversion
  const skuTinsPerCartonMap = useMemo(() => {
    const map = new Map();
    if (filteredSkus) {
      filteredSkus.forEach(sku => {
        map.set(sku.id, sku.tinsPerCarton || 1);
      });
    }
    return map;
  }, [filteredSkus]);
  
  // Note: React Query will automatically refetch when queryKey changes (selectedCountry)
  // No need for manual invalidation - it causes duplicate fetches
  // The useStockCover hook already has the correct queryKey dependency
  
  // Order management panel state
  const [panelState, setPanelState] = useState({
    isOpen: false,
    orderItemId: null,
    countryId: null,
    skuId: null,
    monthKey: null
  });

  // Custom hooks
  const { scrollContainerRef, saveScrollPosition } = useScrollManagement(data, stockCoverLoading);
  const {
    draggedOrderItem,
    setDraggedOrderItem,
    handleDragOver,
    handleDrop,
    handleDragEnter,
    handleDragLeave
  } = useOrderItemDragDrop();

  // Handle country selection
  const handleCountrySelect = (countryId) => {
    setSelectedCountry(countryId);
  };

  // Handle back to country selection
  const handleBackToCountrySelection = () => {
    setSelectedCountry('');
  };

  // Get country code for flag display
  const getCountryCode = (countryName) => {
    const codeMap = {
      'Saudi Arabia': 'SA',
      'UAE': 'AE',
      'United Arab Emirates': 'AE',
      'Bahrain': 'BH',
      'Kuwait': 'KW',
      'Oman': 'OM',
      'Qatar': 'QA',
      'Yemen': 'YE',
      'Lebanon': 'LB',
      'Iraq': 'IQ',
      'Jordan': 'JO',
      'Syria': 'SY',
      'Egypt': 'EG',
    };
    
    if (codeMap[countryName]) {
      return codeMap[countryName];
    }
    
    for (const [key, code] of Object.entries(codeMap)) {
      if (countryName.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(countryName.toLowerCase())) {
        return code;
      }
    }
    
    return 'XX';
  };

  /**
   * Generate months based on oldest actual inventory date
   * Shows 4 years starting from the oldest year found in actual inventory (with opening stock)
   * If oldest date is 2023-01-31, it will show 2023, 2024, 2025, 2026
   */
  const generateMonthsForCountry = (oldestDate) => {
    const months = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Determine start year: 
    // - If oldest date exists, start from that year (not limited to previous year)
    // - Otherwise, start from previous year (1 year before current)
    let startYear;
    
    if (oldestDate) {
      const oldest = new Date(oldestDate);
      const oldestYear = oldest.getFullYear();
      // Start from the actual oldest year found in the data
      startYear = oldestYear;
    } else {
      // No actual inventory data, start from previous year (1 year before)
      startYear = currentYear - 1;
    }
    
    // End year: always show 4 years total from start year
    const endYear = startYear + 3; // 4 years: startYear, startYear+1, startYear+2, startYear+3
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Generate all months from startYear January to endYear December
    for (let year = startYear; year <= endYear; year++) {
      for (let monthNum = 1; monthNum <= 12; monthNum++) {
        const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
        
        // Check if this is the current month
        const isCurrentMonth = year === currentYear && monthNum === currentMonth;
        // Check if this month is in the past (before current month)
        const isPast = year < currentYear || (year === currentYear && monthNum < currentMonth);
        
        months.push({
          key: monthKey,
          year: year,
          month: monthNum,
          label: `${monthNames[monthNum - 1]} ${year}`,
          isCurrentMonth: isCurrentMonth,
          isPast: isPast
        });
      }
    }
    
    return months;
  };

  // Fetch oldest date from actual inventory table (opening stock column)
  // This is the source of truth for determining the oldest month to display
  const { data: oldestInventoryDate, refetch: refetchOldestDate } = useQuery({
    queryKey: ['oldestInventoryDate', selectedCountry],
    queryFn: async () => {
      if (!selectedCountry) return null;
      try {
        // Fetch actual inventory for the selected country
        // Force fresh fetch by not using cached data
        const inventory = await DataverseDataService.getActualInventory({ countryId: selectedCountry });
        if (!inventory || inventory.length === 0) return null;
        
        // Filter to only records with opening stock (not null and not zero)
        // These are the records that represent actual inventory data
        const inventoryWithOpeningStock = inventory.filter(inv => 
          inv.openingStock != null && inv.openingStock !== 0
        );
        
        if (inventoryWithOpeningStock.length === 0) return null;
        
        // Find the oldest date (minimum date) from records with opening stock
        const dates = inventoryWithOpeningStock
          .map(inv => inv.date)
          .filter(date => date != null)
          .map(date => {
            // Handle both string and Date objects
            const dateObj = date instanceof Date ? date : new Date(date);
            return isNaN(dateObj.getTime()) ? null : dateObj;
          })
          .filter(date => date != null);
        
        if (dates.length === 0) return null;
        
        const oldestDate = new Date(Math.min(...dates));
        const oldestDateString = oldestDate.toISOString().split('T')[0];
        
        logger.debug('Oldest inventory date found', {
          oldestDate: oldestDateString,
          totalRecords: inventory.length,
          recordsWithOpeningStock: inventoryWithOpeningStock.length,
          oldestMonthKey: `${oldestDate.getFullYear()}-${String(oldestDate.getMonth() + 1).padStart(2, '0')}`
        });
        
        return oldestDateString; // Return as YYYY-MM-DD
      } catch (error) {
        logger.error('Error fetching oldest inventory date', { error: error.message });
        return null;
      }
    },
    enabled: !!selectedCountry,
    staleTime: 0, // Don't cache - always fetch fresh data
    gcTime: 0, // Don't keep in cache after unmount (React Query v5 uses gcTime instead of cacheTime)
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Generate months based on oldest actual inventory date (from opening stock)
  const months = useMemo(() => {
    const generatedMonths = generateMonthsForCountry(oldestInventoryDate);
    
    logger.debug('Month generation for country', {
      selectedCountry,
      oldestInventoryDate,
      startMonth: generatedMonths[0]?.key,
      endMonth: generatedMonths[generatedMonths.length - 1]?.key,
      totalMonths: generatedMonths.length
    });
    
    return generatedMonths;
  }, [oldestInventoryDate, selectedCountry]);

  // Group months by year for totals - must be before early return
  const monthsByYear = useMemo(() => {
    if (!months || months.length === 0) return {};
    const grouped = {};
    months.forEach(month => {
      if (!grouped[month.year]) {
        grouped[month.year] = [];
      }
      grouped[month.year].push(month);
    });
    return grouped;
  }, [months]);

  // Get unique years in order - must be before early return
  const years = useMemo(() => {
    return Object.keys(monthsByYear).sort((a, b) => parseInt(a) - parseInt(b));
  }, [monthsByYear]);

  // When countryId is selected, useStockCover returns data directly (object of SKUs: { skuId: { sku: {...}, months: {...} } })
  // When no countryId, it returns { countryId: { skuId: {...} } }
  // Since we always pass selectedCountry to useStockCover, stockCoverData is already the country data
  // Group SKUs by category (Range: Standard, Genio, Special) and sort by sortOrder within each group
  // Only show SKUs that are assigned to the selected country
  // MUST be before early return to comply with Rules of Hooks
  const countryDataByRange = useMemo(() => {
    if (!stockCoverData) {
      logger.debug('No stock cover data available (calculated via CalculationEngine)', { 
        selectedCountry, 
        stockCoverLoading 
      });
      return {};
    }
    
    // Use filtered SKUs when country is selected, otherwise use all SKUs
    // Always filter by assignments - no fallback
    const skusToUse = selectedCountry ? filteredSkus : (data?.skus || []);
    if (!skusToUse || skusToUse.length === 0) {
      logger.warn('No SKUs available for country', { 
        selectedCountry, 
        filteredSkusCount: filteredSkus?.length || 0,
        allSkusCount: data?.skus?.length || 0 
      });
      return {};
    }
    
    // Normalize GUIDs for comparison (case-insensitive)
    const normalizeGuid = (guid) => String(guid || '').toLowerCase().trim();
    
    // Create maps for sorting and category lookup (using normalized IDs for keys)
    const normalizedSkuMap = new Map(skusToUse.map(sku => [normalizeGuid(sku.id), sku]));
    const skuIdToNormalizedMap = new Map(skusToUse.map(sku => [normalizeGuid(sku.id), sku.id]));
    const skuSortOrderMap = new Map(skusToUse.map(sku => [normalizeGuid(sku.id), sku.sortOrder != null ? sku.sortOrder : Number.MAX_SAFE_INTEGER]));
    const skuNameMap = new Map(skusToUse.map(sku => [normalizeGuid(sku.id), sku.name || '']));
    
    // Filter stockCoverData to only include SKUs assigned to the country
    // Use normalized GUID comparison to handle case differences
    const filteredStockCover = {};
    let matchesCount = 0;
    let nonMatchesCount = 0;
    const nonMatches = [];
    
    Object.entries(stockCoverData).forEach(([skuId, skuData]) => {
      const normalizedSkuId = normalizeGuid(skuId);
      // Only include SKUs that are in the filtered SKU list (assigned to country)
      if (normalizedSkuMap.has(normalizedSkuId)) {
        // Use the original SKU ID from filteredSkus to ensure consistency
        const originalSkuId = skuIdToNormalizedMap.get(normalizedSkuId) || skuId;
        filteredStockCover[originalSkuId] = skuData;
        matchesCount++;
      } else {
        nonMatchesCount++;
        if (nonMatches.length < 5) {
          nonMatches.push({ stockCoverSkuId: skuId, normalized: normalizedSkuId });
        }
      }
    });
    
    // Log filtering results for debugging
    if (nonMatchesCount > 0 && matchesCount === 0) {
      logger.warn('Stock cover data filtering resulted in no matches', {
        selectedCountry,
        totalStockCoverSkus: Object.keys(stockCoverData).length,
        filteredSkusCount: skusToUse.length,
        matchesCount,
        nonMatchesCount,
        sampleNonMatches: nonMatches.slice(0, 3),
        sampleStockCoverSkuIds: Object.keys(stockCoverData).slice(0, 3),
        sampleFilteredSkuIds: skusToUse.slice(0, 3).map(s => s.id)
      });
    }
    
    // Group by category (Range): Standard (1), Genio (2), Special (3)
    // Only include these three categories as per user requirement
    const rangeOrder = [1, 2, 3]; // Standard, Genio, Special
    const rangeNames = { 1: 'Standard', 2: 'Genio', 3: 'Special' };
    
    const groupedByRange = {};
    
    rangeOrder.forEach(rangeCode => {
      groupedByRange[rangeCode] = {
        name: rangeNames[rangeCode],
        skus: {}
      };
    });
    
    // Add SKUs to their respective range groups
    let skusWithCategory = 0;
    let skusWithoutCategory = 0;
    let skusWithInvalidCategory = 0;
    const categoryBreakdown = { 1: 0, 2: 0, 3: 0, other: 0 };
    Object.entries(filteredStockCover).forEach(([skuId, skuData]) => {
      const normalizedSkuId = normalizeGuid(skuId);
      const sku = normalizedSkuMap.get(normalizedSkuId);
      const category = sku?.category;
      const monthsCount = Object.keys(skuData.months || {}).length;
      
      if (!category) {
        skusWithoutCategory++;
      } else if ([1, 2, 3].includes(category)) {
        skusWithCategory++;
        categoryBreakdown[category]++;
        if (!groupedByRange[category]) {
          groupedByRange[category] = { name: rangeNames[category] || 'Other', skus: {} };
        }
        groupedByRange[category].skus[skuId] = skuData;
      } else {
        skusWithInvalidCategory++;
        categoryBreakdown.other++;
      }
    });
    
    // Sort SKUs within each range by sortOrder
    Object.keys(groupedByRange).forEach(rangeCode => {
      const entries = Object.entries(groupedByRange[rangeCode].skus);
      entries.sort(([skuIdA], [skuIdB]) => {
        const sortOrderA = skuSortOrderMap.get(normalizeGuid(skuIdA)) ?? Number.MAX_SAFE_INTEGER;
        const sortOrderB = skuSortOrderMap.get(normalizeGuid(skuIdB)) ?? Number.MAX_SAFE_INTEGER;
        
        // First sort by sortOrder
        if (sortOrderA !== sortOrderB) {
          return sortOrderA - sortOrderB;
        }
        
        // If sortOrder is the same (or both null), fallback to name
        const nameA = skuNameMap.get(normalizeGuid(skuIdA)) || skuIdA;
        const nameB = skuNameMap.get(normalizeGuid(skuIdB)) || skuIdB;
        return nameA.localeCompare(nameB);
      });
      
      groupedByRange[rangeCode].skus = Object.fromEntries(entries);
    });
    
    return groupedByRange;
  }, [stockCoverData, data?.skus, filteredSkus, selectedCountry]);

  // Show loading state while app data is loading
  // MUST be after all hooks to comply with Rules of Hooks
  if (!data) {
    return <LoadingState message="Loading application data..." />;
  }

  // Show country selection screen if no country is selected
  const showCountrySelection = !selectedCountry;

  const measures = [
    { key: 'openingStock', label: 'Opening Stock', type: 'calc' },
    { key: 'issuesFromStock', label: 'Issues from Stock', type: 'calc' },
    { key: 'netSales', label: 'Net Sales', type: 'calc' },
    { key: 'forecast', label: 'Sales Forecast', type: 'calc' },
    { key: 'budget', label: 'Budget', type: 'calc' },
    { key: 'budgetAchievement', label: 'Budget Achievement %', type: 'percentage' },
    { key: 'ed', label: 'E&D', type: 'calc' },
    { key: 'orderItems', label: 'Orders & Stocks Received', type: 'orderItems' },
    { key: 'closingStock', label: 'Closing Stock', type: 'calc' },
    { key: 'monthsCover', label: 'Months Cover', type: 'cover' }
  ];

  const handleOrderItemClick = (orderItemId, skuId, monthKey) => {
    setPanelState({
      isOpen: true,
      orderItemId,
      countryId: selectedCountry,
      skuId,
      monthKey
    });
  };

  const handleAddOrder = (skuId, monthKey) => {
    setPanelState({
      isOpen: true,
      orderItemId: null,
      countryId: selectedCountry,
      skuId,
      monthKey
    });
  };

  const dragHandlers = {
    handleDragOver,
    handleDrop: (e, month) => handleDrop(e, month, draggedOrderItem),
    handleDragEnter: (e, month) => handleDragEnter(e, month, draggedOrderItem),
    handleDragLeave,
    setDraggedOrderItem
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Country Selection Screen - Inline wizard step */}
      {showCountrySelection ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
          <div className="w-full max-w-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Country</h1>
              <p className="text-gray-600">Choose a country to view stock management data</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {data?.countries && data.countries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.countries.map((country) => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => handleCountrySelect(country.id)}
                      className="group relative w-full p-4 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all duration-150 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-12 h-12 rounded-md bg-gray-50 group-hover:bg-white flex items-center justify-center border border-gray-200 group-hover:border-blue-300 transition-colors">
                          <ReactCountryFlag
                            countryCode={getCountryCode(country.name)}
                            svg
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '4px',
                            }}
                            title={country.name}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-base group-hover:text-blue-700 transition-colors">
                            {country.name}
                          </h3>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No countries available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header - Only visible after country is selected */}
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={handleBackToCountrySelection}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
              </svg>
              <span>Back to Countries</span>
            </button>
          </div>
          
          <StockManagementHeader
            selectedCountry={selectedCountry}
            onCountryChange={(countryId) => {
              setSelectedCountry(countryId);
            }}
            countries={data?.countries}
            unitDisplay={unitDisplay}
            onUnitDisplayChange={setUnitDisplay}
          />

          {/* Show loading state while stock cover data is loading */}
          {stockCoverLoading && (
            <div className="flex-1 flex items-center justify-center">
              <LoadingState message="Loading stock cover data..." />
            </div>
          )}

          {/* Show table when country is selected and data is loaded */}
          {!stockCoverLoading && (
            <>
              {/* Show message if no data found - check countryDataByRange instead of stockCoverData */}
              {(() => {
                const hasData = Object.values(countryDataByRange).some(range => 
                  range && Object.keys(range.skus || {}).length > 0
                );
                return !hasData && !stockCoverLoading;
              })() && (
                <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200 p-8">
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-900 mb-2">No stock data found</p>
                    <p className="text-sm text-gray-600 mb-4">
                      No forecasts, budgets, order items, or inventory data found for this country.
                    </p>
                    <p className="text-xs text-gray-500">
                      Check the browser console for detailed logging.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Show table if data exists - check countryDataByRange instead of stockCoverData */}
              {(() => {
                const hasData = Object.values(countryDataByRange).some(range => 
                  range && Object.keys(range.skus || {}).length > 0
                );
                return hasData;
              })() && (
                <>
                  <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden relative">
        {/* Scroll Indicator */}
        <div className="absolute top-2 right-2 z-30 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium shadow-lg">
          Scroll → to view all months
        </div>
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto" 
        >
          <div style={{ minWidth: `${(months?.length || 0) * 90 + (years.length * 100) + 260}px`, width: 'max-content' }}>
            <table className="w-full text-sm">
              <thead>
                <MonthHeaderRow years={years} monthsByYear={monthsByYear} />
              </thead>
              <tbody>
                {Object.entries(countryDataByRange)
                  .filter(([rangeCode]) => {
                    // Only show ranges that have SKUs
                    const range = countryDataByRange[rangeCode];
                    return range && Object.keys(range.skus).length > 0;
                  })
                  .map(([rangeCode, rangeData]) => {
                    const rangeName = rangeData.name;
                    const skuEntries = Object.entries(rangeData.skus);
                    
                    return (
                      <Fragment key={`range-${rangeCode}`}>
                        {/* Range Header Row - Sticky both vertically and horizontally */}
                        <tr className="sticky border-y-2 border-blue-200" style={{ top: '48px', zIndex: 30 }}>
                          {/* Sticky first cell with text */}
                          <td 
                            className="px-4 py-3 font-bold text-lg text-gray-900"
                            style={{ 
                              position: 'sticky',
                              left: 0,
                              top: '48px',
                              zIndex: 35,
                              backgroundColor: 'rgb(239 246 255)',
                              backgroundImage: 'linear-gradient(to right, rgb(239 246 255), rgb(224 231 255))',
                              minWidth: '260px',
                              width: '260px',
                              whiteSpace: 'nowrap',
                              boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-blue-600 flex-shrink-0">📦</span>
                              <span className="flex-shrink-0 whitespace-nowrap">{rangeName} Range</span>
                              <span className="text-sm font-normal text-gray-500 flex-shrink-0 whitespace-nowrap">
                                ({skuEntries.length} {skuEntries.length === 1 ? 'SKU' : 'SKUs'})
                              </span>
                            </div>
                          </td>
                          {/* Remaining cells that scroll */}
                          <td 
                            colSpan={months.length + years.length}
                            className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50"
                            style={{ 
                              top: '48px'
                            }}
                          ></td>
                        </tr>
                        
                        {/* SKU Rows for this Range */}
                        {skuEntries.map(([skuId, skuData]) => (
                          <Fragment key={skuId}>
                            {measures.map((measure, mIdx) => (
                              <StockCoverRow
                                key={`${skuId}-${measure.key}`}
                                skuId={skuId}
                                skuData={skuData}
                                measure={measure}
                                mIdx={mIdx}
                                years={years}
                                monthsByYear={monthsByYear}
                                saveScrollPosition={saveScrollPosition}
                                draggedOrderItem={draggedOrderItem}
                                dragHandlers={dragHandlers}
                                onOrderItemClick={handleOrderItemClick}
                                onAddOrder={handleAddOrder}
                                unitDisplay={unitDisplay}
                                tinsPerCarton={skuTinsPerCartonMap.get(skuId) || 1}
                              />
                            ))}
                          </Fragment>
                        ))}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mt-4 px-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-50 border border-blue-200"></div>
                <span>Current Month</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-50"></div>
                <span>Even Months</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white border border-gray-200"></div>
                <span>Odd Months</span>
              </div>
            </div>
          </>
        )}
      </>
    )}
        </>
      )}

      {/* Order Management Panel */}
      <OrderManagementPanel
        isOpen={panelState.isOpen}
        onClose={async () => {
          // Refresh data when panel closes to ensure table updates
          await refreshOrderItems();
          await refreshStockCover();
          queryClient.invalidateQueries({ queryKey: ['orderItems'] });
          queryClient.invalidateQueries({ queryKey: ['stockCover'] });
          setPanelState({ ...panelState, isOpen: false });
        }}
        orderItemId={panelState.orderItemId}
        countryId={panelState.countryId}
        skuId={panelState.skuId}
        monthKey={panelState.monthKey}
        onOrderCreated={async (newOrderItem) => {
          await refreshOrderItems();
          await refreshStockCover();
          queryClient.invalidateQueries({ queryKey: ['orderItems'] });
          queryClient.invalidateQueries({ queryKey: ['stockCover'] });
          // Close the panel after order creation - reset all state
          setPanelState({
            isOpen: false,
            orderItemId: null,
            countryId: null,
            skuId: null,
            monthKey: null
          });
        }}
      />
    </div>
  );
};

export default StockManagementPage;
