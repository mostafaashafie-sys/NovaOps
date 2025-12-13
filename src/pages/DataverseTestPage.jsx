import { useState } from 'react';
import DataverseDataService from '@/services/DataverseDataService.js';
import { DataverseSchema } from '@/config/dataverse-schema.js';
import { showMessage } from '@/utils/message.js';
import { generateOptionSetReport } from '@/utils/optionSetVerifier.js';

/**
 * Helper function to get status code label
 * Checks both friendly field name and Dataverse column name
 */
function getStatusLabel(schemaKey, fieldName, value) {
  if (value === null || value === undefined || typeof value !== 'number') return null;
  
  try {
    const schema = DataverseSchema[schemaKey];
    if (!schema || !schema.statusCodes) return null;
    
    // First try the field name as-is (might be friendly name like 'currency', 'region')
    let statusCodes = schema.statusCodes[fieldName];
    
    // If not found, try to find the Dataverse column name
    if (!statusCodes && schema.columns) {
      // Find the friendly name that maps to this Dataverse column
      for (const [friendlyName, dataverseCol] of Object.entries(schema.columns)) {
        if (dataverseCol === fieldName || friendlyName === fieldName) {
          statusCodes = schema.statusCodes[friendlyName];
          if (statusCodes) break;
        }
      }
    }
    
    if (statusCodes && statusCodes[value] !== undefined) {
      return statusCodes[value];
    }
  } catch (error) {
    // Schema not found or error - return null
  }
  return null;
}

/**
 * Table View Component
 * Displays data in a table format with status code labels
 */
function TableView({ data, tableName, schemaKey }) {
  if (!data || data.length === 0) {
    return <div className="text-sm text-gray-500">No data to display</div>;
  }

  // Get all unique keys from all objects
  const allKeys = [...new Set(data.flatMap(obj => Object.keys(obj)))];
  
  // Filter out system/internal fields for cleaner display
  const displayKeys = allKeys.filter(key => 
    !key.startsWith('@') && 
    !key.includes('@odata') &&
    key !== '_new_country_value' &&
    key !== '_new_sku_value' &&
    key !== '_new_order_value' &&
    key !== '_new_distributor_value' &&
    key !== '_new_shippingid_value' &&
    key !== '_new_label_value'
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            {displayKeys.map(key => (
              <th key={key} className="px-2 py-1 text-left font-semibold text-gray-700 border-r">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              {displayKeys.map(key => {
                const value = row[key];
                let displayValue;
                let tooltip;
                
                // Handle null/undefined first
                if (value === null || value === undefined) {
                  displayValue = <span className="text-gray-400">—</span>;
                  tooltip = 'No value';
                }
                // Handle nested objects (from expanded lookups) - must be checked before other types
                else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                  displayValue = JSON.stringify(value);
                  tooltip = JSON.stringify(value, null, 2);
                }
                // Handle arrays
                else if (Array.isArray(value)) {
                  displayValue = JSON.stringify(value);
                  tooltip = JSON.stringify(value, null, 2);
                }
                // Handle Date objects
                else if (value instanceof Date) {
                  displayValue = value.toLocaleString();
                  tooltip = value.toISOString();
                }
                // Handle booleans
                else if (typeof value === 'boolean') {
                  displayValue = value ? 'Yes' : 'No';
                  tooltip = String(value);
                }
                // Handle numbers - check for status code labels
                else if (typeof value === 'number') {
                  if (schemaKey) {
                    const label = getStatusLabel(schemaKey, key, value);
                    if (label) {
                      displayValue = (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium text-blue-700">{label}</span>
                          <span className="text-gray-400 text-xs">({value})</span>
                        </span>
                      );
                      tooltip = `${label} (${value})`;
                    } else {
                      displayValue = String(value);
                      tooltip = String(value);
                    }
                  } else {
                    displayValue = String(value);
                    tooltip = String(value);
                  }
                }
                // Handle strings and other primitives
                else {
                  displayValue = String(value);
                  tooltip = String(value);
                }
                
                return (
                  <td key={key} className="px-2 py-1 border-r text-gray-600 max-w-xs truncate" title={tooltip}>
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Dataverse Test Page
 * Test page to verify Dataverse data fetching for all tables
 */
export default function DataverseTestPage() {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});
  const [viewMode, setViewMode] = useState({}); // 'json' or 'table' for each schema key

  // DataverseDataService is exported as a singleton instance
  const dataverseService = DataverseDataService;

  // Table information mapping
  const tableInfo = {
    countries: {
      name: 'Countries',
      method: 'getCountries',
      description: 'Master data for countries/regions',
      usedIn: ['HomePage', 'StockManagementPage', 'All filters', 'Country selection']
    },
    skus: {
      name: 'SKUs',
      method: 'getSkus',
      description: 'Master data for Stock Keeping Units (products)',
      usedIn: ['StockManagementPage', 'StockManagementService', 'SKU selection']
    },
    orders: {
      name: 'Orders (POs)',
      method: 'getPOs',
      description: 'Purchase Orders - groups multiple order items',
      usedIn: ['POManagementPage', 'POApprovalPage', 'POService']
    },
    orderItems: {
      name: 'Order Items',
      method: 'getOrderItems',
      description: 'Individual SKU orders - handles entire order lifecycle',
      usedIn: ['StockManagementPage', 'OrderManagementPanel', 'AllocationService', 'OrderItemService']
    },
    forecasts: {
      name: 'Forecasts',
      method: 'getForecasts',
      description: 'Forecast data for future demand planning',
      usedIn: ['ForecastsPage', 'ForecastService', 'StockManagementService', 'AutoForecast Azure Function']
    },
    budgets: {
      name: 'Budgets',
      method: 'getBudgets',
      description: 'Budget data used as fallback when forecasts unavailable',
      usedIn: ['StockManagementService', 'AutoForecast Azure Function']
    },
    shipments: {
      name: 'Shipments',
      method: 'getShipments',
      description: 'Shipping/shipment records',
      usedIn: ['ShipmentsPage', 'ShipmentService', 'OrderManagement']
    },
    labels: {
      name: 'Labels',
      method: 'getLabels',
      description: 'Regulatory labels for order items',
      usedIn: ['LabelService', 'OrderItemService', 'Regulatory approval workflow']
    },
    allowedOrderMonths: {
      name: 'Allowed Order Months',
      method: 'getAllowedOrderMonths',
      description: 'Defines which months are allowed for automatic order placement',
      usedIn: ['AutoForecast Azure Function']
    },
    targetCoverStock: {
      name: 'Target Cover Stock',
      method: 'getTargetCoverStock',
      description: 'Configuration for target months of stock cover',
      usedIn: ['StockManagementService', 'AutoForecast Azure Function']
    },
    procurementSafeMargin: {
      name: 'Procurement Safe Margin',
      method: 'getProcurementSafeMargin',
      description: 'Safety margin multiplier for procurement calculations',
      usedIn: ['AutoForecast Azure Function']
    },
    skuCountryAssignments: {
      name: 'SKU Country Assignments',
      method: 'getSkuCountryAssignments',
      description: 'Defines which SKUs are available/assigned to which countries',
      usedIn: ['Forecast visibility controls', 'SKU filtering']
    },
    stockAgingReports: {
      name: 'Stock Aging Reports',
      method: 'getStockAgingData',
      description: 'Tracks inventory near expiry for write-off calculations',
      usedIn: ['AutoForecast Azure Function']
    },
    forecastLogs: {
      name: 'Forecast Logs',
      method: 'getForecastLogs',
      description: 'Audit log of forecast changes and approvals',
      usedIn: ['Forecast approval workflow', 'Audit trail']
    },
    futureInventoryForecasts: {
      name: 'Future Inventory Forecasts',
      method: 'getFutureInventory',
      description: 'Calculated future inventory projections',
      usedIn: ['StockManagementService', 'AutoForecast Azure Function']
    },
    rawAggregated: {
      name: 'Raw Aggregated',
      method: 'getRawAggregated',
      description: 'Aggregated raw data for reporting and analysis',
      usedIn: ['Reporting dashboards', 'Sales analysis']
    },
    actualInventory: {
      name: 'Actual Inventory',
      method: 'getActualInventory',
      description: 'Actual opening and closing stock for real months - real inventory data',
      usedIn: ['StockManagementPage', 'StockManagementService', 'Actual inventory tracking']
    },
    optionSetVerification: {
      name: 'Option Set Verification',
      method: 'verifyOptionSets',
      description: 'Verify global option sets and local choice columns are properly mapped',
      usedIn: ['Schema verification', 'Constants validation']
    }
  };

  const testTable = async (schemaKey) => {
    setLoading(prev => ({ ...prev, [schemaKey]: true }));
    setErrors(prev => ({ ...prev, [schemaKey]: null }));
    setResults(prev => ({ ...prev, [schemaKey]: null }));

    try {
      const info = tableInfo[schemaKey];
      
      // Special handling for option set verification
      if (schemaKey === 'optionSetVerification') {
        const report = await generateOptionSetReport();
        setResults(prev => ({
          ...prev,
          [schemaKey]: {
            count: 1,
            sample: [report],
            fullData: report,
            allRecords: [report]
          }
        }));
        setViewMode(prev => ({
          ...prev,
          [schemaKey]: prev[schemaKey] || 'json'
        }));
        showMessage.success('Option set verification report generated');
        return;
      }
      
      if (!info || !dataverseService[info.method]) {
        throw new Error(`Method ${info.method} not found in DataverseDataService`);
      }

      const data = await dataverseService[info.method]();
      const allRecords = Array.isArray(data) ? data : (data?.value || (data ? [data] : []));
      const count = allRecords.length;
      // Get up to 10 sample records
      const sample = allRecords.slice(0, 10);

      setResults(prev => ({
        ...prev,
        [schemaKey]: {
          count,
          sample,
          fullData: data,
          allRecords: allRecords
        }
      }));
      
      // Set default view mode to 'table' for new results
      setViewMode(prev => ({
        ...prev,
        [schemaKey]: prev[schemaKey] || 'table'
      }));

      showMessage.success(`Successfully fetched ${count} record(s) from ${info.name}`);
    } catch (error) {
      const errorMessage = error.message || error.errorText || 'Unknown error';
      setErrors(prev => ({
        ...prev,
        [schemaKey]: errorMessage
      }));
      showMessage.error(`Error fetching ${tableInfo[schemaKey]?.name || schemaKey}: ${errorMessage}`);
    } finally {
      setLoading(prev => ({ ...prev, [schemaKey]: false }));
    }
  };

  const testAllTables = async () => {
    const schemaKeys = Object.keys(tableInfo);
    for (const schemaKey of schemaKeys) {
      await testTable(schemaKey);
      // Small delay between requests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Test to get oldest date from actual inventory for each country
  const [oldestDatesLoading, setOldestDatesLoading] = useState(false);
  const [oldestDatesResults, setOldestDatesResults] = useState(null);
  const [oldestDatesError, setOldestDatesError] = useState(null);

  const testOldestDatesByCountry = async () => {
    setOldestDatesLoading(true);
    setOldestDatesError(null);
    setOldestDatesResults(null);

    try {
      // First, get all countries
      const countries = await dataverseService.getCountries();
      if (!countries || countries.length === 0) {
        throw new Error('No countries found');
      }

      const results = [];

      // For each country, fetch actual inventory and find oldest date with opening stock
      for (const country of countries) {
        try {
          const inventory = await dataverseService.getActualInventory({ countryId: country.id });
          
          if (!inventory || inventory.length === 0) {
            results.push({
              countryId: country.id,
              countryName: country.name || 'N/A',
              oldestDate: null,
              oldestMonthKey: null,
              totalRecords: 0,
              recordsWithOpeningStock: 0,
              error: null
            });
            continue;
          }

          // Filter to only records with opening stock (not null and not zero)
          const inventoryWithOpeningStock = inventory.filter(inv => 
            inv.openingStock != null && inv.openingStock !== 0
          );

          if (inventoryWithOpeningStock.length === 0) {
            results.push({
              countryId: country.id,
              countryName: country.name || 'N/A',
              oldestDate: null,
              oldestMonthKey: null,
              totalRecords: inventory.length,
              recordsWithOpeningStock: 0,
              error: 'No records with opening stock'
            });
            continue;
          }

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

          if (dates.length === 0) {
            results.push({
              countryId: country.id,
              countryName: country.name || 'N/A',
              oldestDate: null,
              oldestMonthKey: null,
              totalRecords: inventory.length,
              recordsWithOpeningStock: inventoryWithOpeningStock.length,
              error: 'No valid dates found'
            });
            continue;
          }

          const oldestDate = new Date(Math.min(...dates));
          const oldestDateString = oldestDate.toISOString().split('T')[0];
          const oldestMonthKey = `${oldestDate.getFullYear()}-${String(oldestDate.getMonth() + 1).padStart(2, '0')}`;

          results.push({
            countryId: country.id,
            countryName: country.name || 'N/A',
            oldestDate: oldestDateString,
            oldestMonthKey: oldestMonthKey,
            totalRecords: inventory.length,
            recordsWithOpeningStock: inventoryWithOpeningStock.length,
            error: null
          });

          // Small delay between country requests
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.push({
            countryId: country.id,
            countryName: country.name || 'N/A',
            oldestDate: null,
            oldestMonthKey: null,
            totalRecords: 0,
            recordsWithOpeningStock: 0,
            error: error.message || 'Error fetching inventory'
          });
        }
      }

      setOldestDatesResults(results);
      showMessage.success(`Successfully fetched oldest dates for ${results.length} countries`);
    } catch (error) {
      const errorMessage = error.message || error.errorText || 'Unknown error';
      setOldestDatesError(errorMessage);
      showMessage.error(`Error fetching oldest dates: ${errorMessage}`);
    } finally {
      setOldestDatesLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dataverse Schema Test</h1>
            <p className="text-gray-600 mt-1">Test data fetching for all Dataverse tables</p>
          </div>
          <button
            onClick={testAllTables}
            disabled={Object.values(loading).some(l => l)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Test All Tables
          </button>
        </div>

        <div className="grid gap-4">
          {Object.entries(tableInfo).map(([schemaKey, info]) => {
            const schema = DataverseSchema[schemaKey];
            const isLoading = loading[schemaKey];
            const result = results[schemaKey];
            const error = errors[schemaKey];
            const tableName = schema?.tableName || 'N/A';

            return (
              <div
                key={schemaKey}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{info.name}</h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {schemaKey}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                    <div className="text-xs text-gray-500 mb-2">
                      <strong>Table Name:</strong> <code className="bg-gray-100 px-1 rounded">{tableName}</code>
                    </div>
                    <div className="text-xs text-gray-500">
                      <strong>Used In:</strong> {info.usedIn.join(', ')}
                    </div>
                  </div>
                  <button
                    onClick={() => testTable(schemaKey)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap ml-4"
                  >
                    {isLoading ? 'Testing...' : 'Test Fetch'}
                  </button>
                </div>

                {isLoading && (
                  <div className="mt-3 text-sm text-blue-600">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Fetching data...
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
                    <div className="font-semibold text-red-800 mb-1">Error:</div>
                    <div className="text-red-600 font-mono text-xs break-all">{error}</div>
                  </div>
                )}

                {result && !error && (
                  <div className="mt-3 space-y-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-green-800">
                          ✅ Success: {result.count} record(s) fetched
                          {result.sample && result.sample.length > 0 && (
                            <span className="ml-2 text-green-600 font-normal">
                              (Showing {result.sample.length} sample{result.sample.length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                        {result.sample && result.sample.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-700 font-medium">View:</span>
                            <div className="flex gap-1 bg-white rounded border border-green-300 p-0.5">
                              <button
                                onClick={() => setViewMode(prev => ({ ...prev, [schemaKey]: 'table' }))}
                                className={`px-3 py-1 text-xs rounded transition-colors font-medium ${
                                  (viewMode[schemaKey] || 'table') === 'table'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'bg-transparent text-green-700 hover:bg-green-50'
                                }`}
                              >
                                📊 Table
                              </button>
                              <button
                                onClick={() => setViewMode(prev => ({ ...prev, [schemaKey]: 'json' }))}
                                className={`px-3 py-1 text-xs rounded transition-colors font-medium ${
                                  viewMode[schemaKey] === 'json'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'bg-transparent text-green-700 hover:bg-green-50'
                                }`}
                              >
                                {`{}`} JSON
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {result.sample && result.sample.length > 0 && (
                        <details className="mt-2" open>
                          <summary className="cursor-pointer text-green-700 hover:text-green-800 font-medium mb-2">
                            Sample Data ({result.sample.length} of {result.count} records)
                          </summary>
                          <div className="mt-2 p-3 bg-white border border-green-200 rounded overflow-auto max-h-96">
                            {(viewMode[schemaKey] || 'table') === 'table' ? (
                              <TableView data={result.sample} tableName={info.name} schemaKey={schemaKey} />
                            ) : (
                              <pre className="text-xs font-mono bg-gray-50 p-3 rounded border">
                                {JSON.stringify(result.sample, null, 2)}
                              </pre>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Oldest Date by Country Test */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Oldest Inventory Date by Country</h2>
            <p className="text-gray-600 mt-1">Test fetching the oldest date from actual inventory (opening stock) for each country</p>
          </div>
          <button
            onClick={testOldestDatesByCountry}
            disabled={oldestDatesLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {oldestDatesLoading ? 'Testing...' : 'Test Oldest Dates'}
          </button>
        </div>

        {oldestDatesLoading && (
          <div className="text-sm text-blue-600">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Fetching oldest dates for all countries...
            </div>
          </div>
        )}

        {oldestDatesError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
            <div className="font-semibold text-red-800 mb-1">Error:</div>
            <div className="text-red-600 font-mono text-xs break-all">{oldestDatesError}</div>
          </div>
        )}

        {oldestDatesResults && !oldestDatesError && (
          <div className="mt-3 space-y-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
              <div className="font-semibold text-green-800 mb-3">
                ✅ Success: Fetched oldest dates for {oldestDatesResults.length} countries
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r">Country Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r">Country ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r">Oldest Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r">Oldest Month</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r">Total Records</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r">With Opening Stock</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oldestDatesResults.map((result, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 border-r text-gray-600 font-medium">{result.countryName}</td>
                        <td className="px-3 py-2 border-r text-gray-500 font-mono text-xs">{result.countryId}</td>
                        <td className="px-3 py-2 border-r text-gray-600">
                          {result.oldestDate ? (
                            <span className="font-medium text-blue-700">{result.oldestDate}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r text-gray-600">
                          {result.oldestMonthKey ? (
                            <span className="font-medium text-purple-700">{result.oldestMonthKey}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r text-gray-600">{result.totalRecords}</td>
                        <td className="px-3 py-2 border-r text-gray-600">
                          <span className={result.recordsWithOpeningStock > 0 ? 'font-medium text-green-700' : 'text-gray-500'}>
                            {result.recordsWithOpeningStock}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {result.error ? (
                            <span className="text-red-600 text-xs">{result.error}</span>
                          ) : result.oldestDate ? (
                            <span className="text-green-600 text-xs">✓ Success</span>
                          ) : (
                            <span className="text-gray-400 text-xs">No data</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Test Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Click "Test Fetch" on any table to test fetching data from Dataverse</li>
          <li>Click "Test All Tables" to test all tables sequentially</li>
          <li>Click "Test Oldest Dates" to fetch the oldest inventory date (with opening stock) for each country</li>
          <li>Green success messages indicate successful data fetching with record count</li>
          <li>Red error messages show any issues with the API call or schema configuration</li>
          <li>Sample data can be expanded to view the structure of fetched records</li>
          <li>Toggle between <strong>Table</strong> and <strong>JSON</strong> views using the buttons above each result</li>
          <li>Table view shows data in a structured format, JSON view shows raw data structure</li>
        </ul>
      </div>
    </div>
  );
}

