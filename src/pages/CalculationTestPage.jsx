import { useState, useEffect } from 'react';
import { Card, Button, Select, Input, Table, Alert, Space, Divider, Typography, Spin, Tag, Descriptions, Modal, Tabs } from 'antd';
import { showMessage } from '@/utils/message.js';
import { StockCalculationService } from '@/services/index.js';
import { registry, getMeasureKeys, getAllMeasures, registerMeasure } from '@/schema/registry.js';
import { calculationOrchestrator } from '@/services/CalculationOrchestrator.js';
import { useApp } from '@/providers/index.js';
import { Logger } from '@/utils/index.js';
import { getTableName, getTableSchema, getColumnName } from '@/config/dataverse-schema.js';
import DataverseDataService from '@/services/DataverseDataService.js';
import { parseODataQuery, generateUpdatedComponentCode } from '@/utils/queryParser.js';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const logger = new Logger('CalculationTestPage');

/**
 * Calculation Engine Test Page
 * UI for testing individual measures and batch calculations
 */
export default function CalculationTestPage() {
  const { data: appData } = useApp();
  const [selectedMeasures, setSelectedMeasures] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableMeasures, setAvailableMeasures] = useState([]);
  const [measureDetails, setMeasureDetails] = useState({});
  const [selectedMeasureForDetails, setSelectedMeasureForDetails] = useState(null);
  const [editingQuery, setEditingQuery] = useState(null); // { measureKey, componentIdx }
  const [editedQueries, setEditedQueries] = useState({}); // { measureKey_componentIdx: queryString }
  
  // Test context inputs
  const [testContext, setTestContext] = useState({
    countryId: '',
    skuId: '',
    year: 2024,
    month: 1
  });

  // Initialize registry and load measures
  useEffect(() => {
    try {
      registry.initialize();
      const measures = getAllMeasures();
      const keys = getMeasureKeys();
      
      setAvailableMeasures(keys);
      
      // Build measure details map
      const details = {};
      measures.forEach(measure => {
        const dependencies = measure.components
          .filter(c => c.source.type === 'measure')
          .map(c => c.source.measureKey)
          .filter(Boolean);
        const isDependent = dependencies.length > 0;
        
        details[measure.key] = {
          name: measure.name || measure.key,
          description: measure.description || '',
          dependencies,
          isDependent, // Flag to identify dependent measures
          fullMeasure: measure // Store full measure for detailed view
        };
      });
      setMeasureDetails(details);
      
      logger.debug('Measures loaded', { count: keys.length, measures: keys });
    } catch (err) {
      const errorMessage = err?.message || String(err);
      const errorStack = err?.stack;
      logger.error('Failed to initialize registry', { 
        error: err,
        message: errorMessage,
        stack: errorStack
      });
      console.error('❌ Registry initialization error:', err);
      console.error('Error message:', errorMessage);
      console.error('Error stack:', errorStack);
      setError(`Failed to initialize measure registry: ${errorMessage}`);
    }
  }, []);

  // Get countries and SKUs from app data
  const countries = appData?.countries || [];
  const skus = appData?.skus || [];

  const [debugInfo, setDebugInfo] = useState(null);


  const handleTestSingleMeasure = async (measureKey) => {
    if (!testContext.countryId || !testContext.skuId) {
      setError('Please select a country and SKU');
      return;
    }

    setLoading(true);
    setError(null);
    setTestResults(null);
    setDebugInfo(null);

    try {
      const filters = {};
      const context = {
        countryId: testContext.countryId,
        skuId: testContext.skuId,
        year: testContext.year,
        month: testContext.month
      };

      logger.debug('Testing single measure', { measureKey, context });
      
      // Get measure details to debug
      const measure = registry.get(measureKey);
      const debugData = {
        measureKey,
        measureName: measure?.name,
        components: []
      };

      // For each table component, fetch and analyze the data
      if (measure) {
        for (const component of measure.components) {
          if (component.source.type === 'table' && component.source.tableKey) {
            try {
              const tableName = getTableName(component.source.tableKey);
              const tableSchema = getTableSchema(component.source.tableKey);
              
              // Build the same filter query that CalculationEngine would use
              const { year, month, date, ...contextWithoutDateFields } = context;
              const allFilters = { ...filters, ...contextWithoutDateFields };
              
              // Calculate date range - always create one for month/year filtering (matching CalculationEngine logic)
              let dateRange = null;
              if (context.year && context.month) {
                // First day of the month
                const startDate = new Date(context.year, context.month - 1, 1);
                // First day of the next month (exclusive)
                const endDate = new Date(context.year, context.month, 1);
                dateRange = {
                  start: startDate.toISOString().split('T')[0], // YYYY-MM-DD format (e.g., 2025-01-01)
                  end: endDate.toISOString().split('T')[0] // YYYY-MM-DD format (e.g., 2025-02-01)
                };
              }
              
              // Build filter query - match the same logic as CalculationEngine
              let filterQuery = DataverseDataService.buildFilter(component.source.tableKey, allFilters);
              
              // Extract filter expression (remove $filter= prefix if present)
              let filterExpression = '';
              if (filterQuery) {
                if (filterQuery.startsWith('$filter=')) {
                  filterExpression = filterQuery.substring(8); // Remove "$filter=" prefix
                } else {
                  filterExpression = filterQuery;
                }
              }
              
              // Add date filtering - use date range for month-based filtering (Dataverse doesn't support year()/month() functions)
              // ALL date ranges use: ge (greater than or equal) start and lt (less than) end
              const dateField = getColumnName(component.source.tableKey, 'date') || 'new_date';
              if (dateRange) {
                const dateFilter = `${dateField} ge '${dateRange.start}' and ${dateField} lt '${dateRange.end}'`;
                filterExpression = filterExpression ? `(${filterExpression}) and ${dateFilter}` : dateFilter;
              }
              
              // Reconstruct query with $filter= prefix
              const finalFilterQuery = filterExpression ? `$filter=${filterExpression}` : '';
              const queryString = finalFilterQuery ? `?${finalFilterQuery}` : '';
              const fullQuery = `/${tableName}${queryString}`;
              
              // Fetch data
              const data = await DataverseDataService.fetch(fullQuery);
              const records = data.value || [];
              
              // Transform records
              const transformed = DataverseDataService.transformResponse(component.source.tableKey, data);
              const transformedRecords = transformed.value || transformed || [];
              
              // Apply component filters
              let filteredRecords = transformedRecords;
              if (component.filters) {
                // Simple filter application for debugging
                filteredRecords = transformedRecords.filter(record => {
                  if (!component.filters.conditions) return true;
                  const results = component.filters.conditions.map(condition => {
                    const recordValue = record[condition.column];
                    if (condition.operator === 'equals') {
                      return String(recordValue).toLowerCase() === String(condition.value).toLowerCase();
                    }
                    if (condition.operator === 'contains') {
                      return String(recordValue || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
                    }
                    return false;
                  });
                  return component.filters.logic === 'OR' 
                    ? results.some(r => r)
                    : results.every(r => r);
                });
              }
              
              // Get field name and values
              const fieldName = component.source.fieldName || component.source.quantityField || 'quantity';
              const values = filteredRecords.map(r => {
                const val = r[fieldName];
                return val !== null && val !== undefined ? Number(val) : 0;
              }).filter(v => !isNaN(v) && isFinite(v));
              
              debugData.components.push({
                componentName: component.name,
                tableName,
                query: fullQuery,
                rawRecordsCount: records.length,
                transformedRecordsCount: transformedRecords.length,
                filteredRecordsCount: filteredRecords.length,
                fieldName,
                values: values.slice(0, 10), // First 10 values
                totalValues: values.length,
                sum: values.reduce((s, v) => s + v, 0),
                sampleRecords: filteredRecords.slice(0, 3).map(r => ({
                  date: r.date,
                  docType: r.docType,
                  channel: r.channel,
                  [fieldName]: r[fieldName],
                  countryId: r.countryId || r._new_country_value,
                  skuId: r.skuId || r._new_sku_value
                }))
              });
            } catch (err) {
              debugData.components.push({
                componentName: component.name,
                error: err.message
              });
            }
          }
        }
      }
      
      setDebugInfo(debugData);
      
      const result = await StockCalculationService.executeMeasure(measureKey, filters, context);
      
      setTestResults({
        type: 'single',
        measureKey,
        result,
        context
      });
      
      logger.debug('Single measure test completed', { measureKey, result });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Single measure test failed', { measureKey, error: errorMessage, stack: err.stack });
      setError(`Error testing measure "${measureKey}": ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestBatch = async () => {
    if (selectedMeasures.length === 0) {
      setError('Please select at least one measure');
      return;
    }

    if (!testContext.countryId || !testContext.skuId) {
      setError('Please select a country and SKU');
      return;
    }

    setLoading(true);
    setError(null);
    setTestResults(null);

    try {
      const filters = {};
      const context = {
        countryId: testContext.countryId,
        skuId: testContext.skuId,
        year: testContext.year,
        month: testContext.month
      };

      logger.debug('Testing batch measures', { measures: selectedMeasures, context });
      
      // Get dependency graph and execution plan
      const dependencyGraph = registry.buildDependencyGraph(selectedMeasures);
      const executionOrder = registry.topologicalSort(dependencyGraph);
      const levels = registry.groupByLevel(dependencyGraph, executionOrder);
      
      // Execute batch
      const results = await StockCalculationService.executeBatch(selectedMeasures, filters, context);
      
      setTestResults({
        type: 'batch',
        requestedMeasures: selectedMeasures,
        results,
        dependencyGraph: Array.from(dependencyGraph.entries()).map(([key, deps]) => ({
          key: key,
          measure: key,
          dependencies: Array.from(deps)
        })),
        executionOrder,
        levels,
        context
      });
      
      // Show warning if all results are 0
      const allZero = Object.values(results).every(r => r === 0 || (typeof r === 'number' && isNaN(r)));
      if (allZero) {
        setError('All measures returned 0. This might indicate: 1) No data matches the filters (check country/SKU/date), 2) Field name mismatch, or 3) Component filters excluding all records. Check the measure details to see the exact query being executed.');
      }
      
      logger.debug('Batch test completed', { measures: selectedMeasures, results });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      logger.error('Batch test failed', { 
        measures: selectedMeasures, 
        error: errorMessage,
        stack: errorStack
      });
      setError(`Error testing batch: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestDependencyGraph = () => {
    if (selectedMeasures.length === 0) {
      setError('Please select at least one measure');
      return;
    }

    try {
      const dependencyGraph = registry.buildDependencyGraph(selectedMeasures);
      const executionOrder = registry.topologicalSort(dependencyGraph);
      const levels = registry.groupByLevel(dependencyGraph, executionOrder);
      
      setTestResults({
        type: 'dependency',
        requestedMeasures: selectedMeasures,
        dependencyGraph: Array.from(dependencyGraph.entries()).map(([key, deps]) => ({
          key: key,
          measure: key,
          dependencies: Array.from(deps)
        })),
        executionOrder,
        levels
      });
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error building dependency graph: ${errorMessage}`);
    }
  };

  const resultsColumns = [
    {
      title: 'Measure',
      dataIndex: 'measure',
      key: 'measure',
      sorter: (a, b) => {
        const nameA = measureDetails[a.measure]?.name || a.measure;
        const nameB = measureDetails[b.measure]?.name || b.measure;
        return nameA.localeCompare(nameB);
      },
      render: (text) => {
        const details = measureDetails[text];
        return (
          <div>
            <Text strong>{details?.name || text}</Text>
            <div>
              <Text type="secondary" className="text-xs">{text}</Text>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Category',
      dataIndex: 'measure',
      key: 'category',
      render: (measureKey) => {
        const details = measureDetails[measureKey];
        return details?.category ? <Tag>{details.category}</Tag> : '-';
      },
      filters: [
        { text: 'Sales', value: 'Sales' },
        { text: 'Inventory', value: 'Inventory' },
        { text: 'Forecast & Budget', value: 'Forecast & Budget' },
        { text: 'Stock cover', value: 'Stock cover' },
        { text: 'Growth', value: 'Growth' },
        { text: 'Average', value: 'Average' },
        { text: 'Helper', value: 'Helper' },
      ].filter(f => availableMeasures.some(m => measureDetails[m]?.category === f.value)),
      onFilter: (value, record) => measureDetails[record.measure]?.category === value,
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      sorter: (a, b) => {
        const valA = typeof a.result === 'number' && !isNaN(a.result) ? a.result : -Infinity;
        const valB = typeof b.result === 'number' && !isNaN(b.result) ? b.result : -Infinity;
        return valA - valB;
      },
      defaultSortOrder: 'descend',
      render: (value, record) => {
        if (value === null || value === undefined) return <Text type="secondary">null</Text>;
        if (typeof value === 'number') {
          if (isNaN(value)) return <Tag color="red">NaN</Tag>;
          if (value === 0) return <Tag color="orange">0</Tag>;
          return <Text>{value.toLocaleString()}</Text>;
        }
        return <Text>{String(value)}</Text>;
      }
    },
    {
      title: 'Unit',
      dataIndex: 'measure',
      key: 'unit',
      render: (measureKey) => {
        const details = measureDetails[measureKey];
        return details?.unit ? <Text type="secondary" className="text-xs">{details.unit}</Text> : '-';
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => setSelectedMeasureForDetails(record.measure)}
        >
          View Details
        </Button>
      )
    }
  ];

  const dependencyColumns = [
    {
      title: 'Measure',
      dataIndex: 'measure',
      key: 'measure',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Dependencies',
      dataIndex: 'dependencies',
      key: 'dependencies',
      render: (deps) => {
        if (!deps || deps.length === 0) {
          return <Tag color="green">None</Tag>;
        }
        return (
          <Space wrap>
            {deps.map(dep => (
              <Tag key={dep} color="blue">{dep}</Tag>
            ))}
          </Space>
        );
      }
    }
  ];

  // Get country and SKU names for display (used in multiple places)
  const selectedCountry = countries.find(c => c.id === testContext.countryId);
  const selectedSku = skus.find(s => s.id === testContext.skuId);

  // State for docType mappings
  const [docTypeMappings, setDocTypeMappings] = useState({ nameToValue: {}, valueToName: {} });
  
  // Load docType mappings on mount
  useEffect(() => {
    const loadDocTypeMappings = async () => {
      try {
        const { getDocTypeNumericValue, getAllDocTypeMappings } = await import('@/utils/docTypeMapper.js');
        const mappings = await getAllDocTypeMappings();
        
        // Build reverse mapping
        const nameToValue = {};
        for (const [numericValue, name] of Object.entries(mappings)) {
          if (name) {
            const normalizedName = String(name).toLowerCase().trim();
            nameToValue[normalizedName] = parseInt(numericValue, 10);
            nameToValue[String(name).trim()] = parseInt(numericValue, 10);
          }
        }
        
        setDocTypeMappings({ nameToValue, valueToName: mappings });
      } catch (err) {
        logger.warn('Failed to load docType mappings', err);
      }
    };
    
    loadDocTypeMappings();
  }, []);

  // Get detailed measure information for display with applied filters
  const getMeasureDetails = (measureKey) => {
    const measure = registry.get(measureKey);
    if (!measure) return null;

    const components = measure.components
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((component, index) => {
        const componentInfo = {
          index: index + 1,
          name: component.name,
          sortOrder: component.sortOrder,
          operation: component.operation || 'sum',
          aggregation: component.aggregation || 'sum',
          sourceType: component.source.type,
          filters: component.filters,
          timeIntelligence: component.timeIntelligence
        };

        // Handle table source
        if (component.source.type === 'table' && component.source.tableKey) {
          try {
            const tableName = getTableName(component.source.tableKey);
            const tableSchema = getTableSchema(component.source.tableKey);
            const fieldName = component.source.fieldName || component.source.quantityField || 'quantity';
            const dataverseColumn = getColumnName(component.source.tableKey, fieldName) || fieldName;
            
            // Get date column information for filtering
            let dateColumnInfo = null;
            try {
              // Check if time intelligence specifies a custom date field
              const dateFieldName = component.timeIntelligence?.dateField || 'date';
              const dataverseDateColumn = getColumnName(component.source.tableKey, dateFieldName);
              
              if (dataverseDateColumn) {
                dateColumnInfo = {
                  friendlyName: dateFieldName,
                  dataverseName: dataverseDateColumn,
                  isCustom: component.timeIntelligence?.dateField !== undefined && component.timeIntelligence?.dateField !== 'date'
                };
              } else {
                // Fallback to default date column
                const defaultDateColumn = getColumnName(component.source.tableKey, 'date') || 'new_date';
                dateColumnInfo = {
                  friendlyName: 'date',
                  dataverseName: defaultDateColumn,
                  isCustom: false
                };
              }
            } catch (dateErr) {
              // If date column lookup fails, use default
              dateColumnInfo = {
                friendlyName: 'date',
                dataverseName: 'new_date',
                isCustom: false,
                error: dateErr.message
              };
            }

            // Get applied filters from test context
            const appliedFilters = [];
            
            // Build the actual OData filter query that will be used
            let odataFilterParts = [];
            
            // Country filter
            if (testContext.countryId) {
              const countryFilterField = tableSchema.filterFields?.country || getColumnName(component.source.tableKey, 'countryId') || '_new_country_value';
              const countryFilterValue = `'${testContext.countryId}'`;
              odataFilterParts.push(`${countryFilterField} eq ${countryFilterValue}`);
              appliedFilters.push({
                type: 'context',
                label: 'Country Filter',
                column: countryFilterField,
                value: testContext.countryId,
                displayValue: selectedCountry?.name || testContext.countryId,
                friendlyColumn: 'countryId',
                odataFilter: `${countryFilterField} eq ${countryFilterValue}`
              });
            }

            // SKU filter
            if (testContext.skuId) {
              const skuFilterField = tableSchema.filterFields?.sku || getColumnName(component.source.tableKey, 'skuId') || '_new_sku_value';
              const skuFilterValue = `'${testContext.skuId}'`;
              odataFilterParts.push(`${skuFilterField} eq ${skuFilterValue}`);
              appliedFilters.push({
                type: 'context',
                label: 'SKU Filter',
                column: skuFilterField,
                value: testContext.skuId,
                displayValue: selectedSku?.name || testContext.skuId,
                friendlyColumn: 'skuId',
                odataFilter: `${skuFilterField} eq ${skuFilterValue}`
              });
            }

            // Date filter - calculate based on context and time intelligence
            if (testContext.year && testContext.month) {
              let dateRange = null;
              const dateField = component.timeIntelligence?.dateField || 'date';
              const dataverseDateColumn = dateColumnInfo?.dataverseName || 'new_date';

              // Calculate date range based on time intelligence or default to month
              if (component.timeIntelligence) {
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth() + 1;
                const contextYear = testContext.year || currentYear;
                const contextMonth = testContext.month || currentMonth;
                const contextDate = new Date(contextYear, contextMonth - 1, 1);

                let startDate, endDate;
                switch (component.timeIntelligence.type) {
                  case 'sameperiodlastyear':
                    startDate = new Date(contextYear - 1, contextMonth - 1, 1);
                    endDate = new Date(contextYear - 1, contextMonth, 0);
                    break;
                  case 'ytd':
                    startDate = new Date(contextYear, 0, 1);
                    endDate = contextDate;
                    break;
                  case 'rolling':
                    const periods = component.timeIntelligence.periods || 12;
                    startDate = new Date(contextDate);
                    startDate.setMonth(startDate.getMonth() - periods);
                    startDate.setDate(1);
                    endDate = contextDate;
                    break;
                  case 'forward':
                    const forwardPeriods = component.timeIntelligence.periods || 12;
                    startDate = new Date(contextDate);
                    startDate.setMonth(startDate.getMonth() + 1);
                    startDate.setDate(1);
                    endDate = new Date(startDate);
                    endDate.setMonth(endDate.getMonth() + forwardPeriods);
                    endDate.setDate(0);
                    break;
                  case 'lastyear':
                    startDate = new Date(contextYear - 1, 0, 1);
                    endDate = new Date(contextYear - 1, 11, 31);
                    break;
                  case 'pastlastyear':
                    startDate = new Date(contextYear - 2, 0, 1);
                    endDate = new Date(contextYear - 2, 11, 31);
                    break;
                  default:
                    startDate = new Date(contextYear, contextMonth - 1, 1);
                    endDate = new Date(contextYear, contextMonth, 0);
                }

                if (component.timeIntelligence.startDate) {
                  startDate = new Date(component.timeIntelligence.startDate);
                }
                if (component.timeIntelligence.endDate) {
                  endDate = new Date(component.timeIntelligence.endDate);
                }

                dateRange = {
                  start: startDate.toISOString().split('T')[0],
                  end: endDate.toISOString().split('T')[0]
                };
              } else if (testContext.year && testContext.month) {
                // For month-based filtering, create a date range: first day of month to first day of next month (exclusive)
                // First day of the month
                const startDate = new Date(testContext.year, testContext.month - 1, 1);
                // First day of the next month (exclusive)
                const endDate = new Date(testContext.year, testContext.month, 1);
                
                dateRange = {
                  start: startDate.toISOString().split('T')[0], // YYYY-MM-DD format (e.g., 2025-01-01)
                  end: endDate.toISOString().split('T')[0] // YYYY-MM-DD format (e.g., 2025-02-01)
                };
              }

              // Build date filter - always use date range (Dataverse doesn't support year()/month() functions)
              // ALL date ranges use: ge (greater than or equal) start and lt (less than) end
              let dateFilterOData = '';
              if (dateRange) {
                dateFilterOData = `${dataverseDateColumn} ge '${dateRange.start}' and ${dataverseDateColumn} lt '${dateRange.end}'`;
                odataFilterParts.push(`(${dateFilterOData})`);
                appliedFilters.push({
                  type: 'date',
                  label: dateRange.start === dateRange.end ? 'Date Filter' : (component.timeIntelligence ? 'Date Range Filter (Time Intelligence)' : 'Month Filter (Date Range)'),
                  column: dataverseDateColumn,
                  value: dateRange,
                  displayValue: `${dateRange.start} to ${dateRange.end} (exclusive end)`,
                  friendlyColumn: dateField,
                  timeIntelligence: component.timeIntelligence?.type,
                  odataFilter: dateFilterOData,
                  note: component.timeIntelligence 
                    ? `Time intelligence: ${component.timeIntelligence.type} - Using ${dateRange.start} >= date < ${dateRange.end}` 
                    : `Using date range: ${dateRange.start} >= date < ${dateRange.end} to get all records in ${testContext.year}-${String(testContext.month).padStart(2, '0')}`
                });
              }
            }

            // Add component-level filters and build filter info with docType mappings
            let filterInfo = [];
            if (component.filters && component.filters.conditions && component.filters.conditions.length > 0) {
              // Build filter info for UI display with docType numeric values
              filterInfo = component.filters.conditions.map((filter, fIdx) => {
                let displayName = filter.value !== undefined ? String(filter.value) : filter.values ? filter.values.join(', ') : '';
                let numericValue = null;
                
                // For docType, get numeric value and display name
                if (filter.column === 'docType') {
                  if (typeof filter.value === 'string') {
                    // Look up numeric value from name
                    const normalizedName = filter.value.toLowerCase().trim();
                    numericValue = docTypeMappings.nameToValue[normalizedName] || docTypeMappings.nameToValue[filter.value.trim()] || null;
                    // Keep the original name for display
                    displayName = filter.value;
                  } else if (typeof filter.value === 'number') {
                    // Look up name from numeric value
                    numericValue = filter.value;
                    displayName = docTypeMappings.valueToName[String(filter.value)] || String(filter.value);
                  }
                }
                
                return {
                  index: fIdx,
                  column: filter.column,
                  operator: filter.operator,
                  value: filter.value,
                  values: filter.values,
                  displayName,
                  numericValue
                };
              });
              
              const componentFilterParts = component.filters.conditions.map(filter => {
                const filterColumn = getColumnName(component.source.tableKey, filter.column) || filter.column;
                let filterValue;
                if (filter.values) {
                  filterValue = `(${filter.values.map(v => `'${v}'`).join(',')})`;
                } else {
                  filterValue = typeof filter.value === 'string' ? `'${filter.value}'` : filter.value;
                }
                return `${filterColumn} ${filter.operator} ${filterValue}`;
              });
              const componentFilterOData = component.filters.logic === 'OR' 
                ? `(${componentFilterParts.join(' or ')})`
                : componentFilterParts.join(' and ');
              odataFilterParts.push(`(${componentFilterOData})`);
            }
            
            componentInfo.filterInfo = filterInfo;
            
            // Build final OData filter query
            const finalODataFilter = odataFilterParts.length > 0 
              ? `$filter=${odataFilterParts.join(' and ')}`
              : '';
            
            componentInfo.tableKey = component.source.tableKey;
            componentInfo.tableName = tableName;
            componentInfo.fieldName = fieldName;
            componentInfo.dataverseColumn = dataverseColumn;
            componentInfo.columnInfo = `Table: ${tableName} → Column: ${dataverseColumn} (${fieldName})`;
            componentInfo.dateColumnInfo = dateColumnInfo;
            componentInfo.appliedFilters = appliedFilters;
            componentInfo.odataFilterQuery = finalODataFilter;
            componentInfo.fullODataQuery = finalODataFilter 
              ? `/${tableName}?${finalODataFilter}`
              : `/${tableName}`;
          } catch (err) {
            componentInfo.tableKey = component.source.tableKey;
            componentInfo.columnInfo = `Table: ${component.source.tableKey} → Column: ${component.source.fieldName || 'N/A'}`;
          }
        }

        // Handle measure source
        if (component.source.type === 'measure' && component.source.measureKey) {
          const depMeasure = registry.get(component.source.measureKey);
          componentInfo.measureKey = component.source.measureKey;
          componentInfo.measureName = depMeasure?.name || component.source.measureKey;
          componentInfo.columnInfo = `Measure: ${componentInfo.measureName} (${component.source.measureKey})`;
        }

        // Handle conditional source
        if (component.source.type === 'conditional' && component.conditionalConfig) {
          const primary = component.conditionalConfig.primarySource;
          const fallback = component.conditionalConfig.fallbackSource;
          componentInfo.conditionalInfo = {
            conditions: component.conditionalConfig.conditions,
            primary: primary.type === 'table' ? `Table: ${primary.tableKey}` : `Measure: ${primary.measureKey}`,
            fallback: fallback.type === 'table' ? `Table: ${fallback.tableKey}` : `Measure: ${fallback.measureKey}`
          };
        }

        return componentInfo;
      });

    return {
      key: measure.key,
      name: measure.name,
      description: measure.description,
      category: measure.metadata?.category,
      unit: measure.metadata?.unit,
      components,
      timeIntelligence: measure.timeIntelligence
    };
  };

  return (
    <div className="p-6 space-y-6">
      <Title level={2}>Calculation Engine Test</Title>
      <Paragraph>
        Test individual measures and batch calculations. Use this page to debug calculation issues.
      </Paragraph>

      {error && (
        <Alert
          title="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card title="Test Configuration" className="h-fit">
          <Space orientation="vertical" className="w-full" size="large">
            <div>
              <Text strong>Country:</Text>
              <Select
                className="w-full mt-2"
                placeholder="Select country"
                value={testContext.countryId || undefined}
                onChange={(value) => setTestContext({ ...testContext, countryId: value })}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {countries.map(country => (
                  <Option key={country.id} value={country.id}>
                    {country.name}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong>SKU:</Text>
              <Select
                className="w-full mt-2"
                placeholder="Select SKU"
                value={testContext.skuId || undefined}
                onChange={(value) => setTestContext({ ...testContext, skuId: value })}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {skus.map(sku => (
                  <Option key={sku.id} value={sku.id}>
                    {sku.name}
                  </Option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text strong>Year:</Text>
                <Input
                  type="number"
                  className="mt-2"
                  value={testContext.year}
                  onChange={(e) => setTestContext({ ...testContext, year: parseInt(e.target.value) || 2024 })}
                />
              </div>
              <div>
                <Text strong>Month:</Text>
                <Input
                  type="number"
                  className="mt-2"
                  min={1}
                  max={12}
                  value={testContext.month}
                  onChange={(e) => setTestContext({ ...testContext, month: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <Divider />

            <div>
              <Text strong>Select Measures to Test:</Text>
              <Tabs
                className="mt-2"
                items={[
                  {
                    key: 'single',
                    label: 'Single Measures (Table-based)',
                    children: (
                      <Select
                        mode="multiple"
                        className="w-full"
                        placeholder="Select single measures to test"
                        value={selectedMeasures.filter(m => !measureDetails[m]?.isDependent)}
                        onChange={(values) => {
                          // Merge with dependent measures
                          const dependentMeasures = selectedMeasures.filter(m => measureDetails[m]?.isDependent);
                          const newSelected = [...dependentMeasures, ...values];
                          setSelectedMeasures(newSelected);
                          // When a measure is selected, show its details
                          if (newSelected.length > 0) {
                            const lastSelected = newSelected[newSelected.length - 1];
                            setSelectedMeasureForDetails(lastSelected);
                          } else {
                            setSelectedMeasureForDetails(null);
                          }
                        }}
                        showSearch
                        filterOption={(input, option) => {
                          const measureKey = option.value;
                          const details = measureDetails[measureKey];
                          const searchText = `${measureKey} ${details?.name || ''}`.toLowerCase();
                          return searchText.indexOf(input.toLowerCase()) >= 0;
                        }}
                      >
                        {availableMeasures
                          .filter(m => !measureDetails[m]?.isDependent)
                          .map(measureKey => {
                            const details = measureDetails[measureKey];
                            return (
                              <Option key={measureKey} value={measureKey}>
                                {details?.name || measureKey}
                              </Option>
                            );
                          })}
                      </Select>
                    )
                  },
                  {
                    key: 'dependent',
                    label: 'Dependent Measures (Use other measures)',
                    children: (
                      <Select
                        mode="multiple"
                        className="w-full"
                        placeholder="Select dependent measures to test"
                        value={selectedMeasures.filter(m => measureDetails[m]?.isDependent)}
                        onChange={(values) => {
                          // Merge with single measures
                          const singleMeasures = selectedMeasures.filter(m => !measureDetails[m]?.isDependent);
                          const newSelected = [...singleMeasures, ...values];
                          setSelectedMeasures(newSelected);
                          // When a measure is selected, show its details
                          if (newSelected.length > 0) {
                            const lastSelected = newSelected[newSelected.length - 1];
                            setSelectedMeasureForDetails(lastSelected);
                          } else {
                            setSelectedMeasureForDetails(null);
                          }
                        }}
                        showSearch
                        filterOption={(input, option) => {
                          const measureKey = option.value;
                          const details = measureDetails[measureKey];
                          const searchText = `${measureKey} ${details?.name || ''} ${details?.dependencies?.join(' ') || ''}`.toLowerCase();
                          return searchText.indexOf(input.toLowerCase()) >= 0;
                        }}
                      >
                        {availableMeasures
                          .filter(m => measureDetails[m]?.isDependent)
                          .map(measureKey => {
                            const details = measureDetails[measureKey];
                            return (
                              <Option key={measureKey} value={measureKey}>
                                {details?.name || measureKey}
                                {details?.dependencies?.length > 0 && (
                                  <Text type="secondary" className="ml-2 text-xs">
                                    (depends on: {details.dependencies.join(', ')})
                                  </Text>
                                )}
                              </Option>
                            );
                          })}
                      </Select>
                    )
                  }
                ]}
              />
            </div>

            <Space orientation="vertical" className="w-full">
              <Button
                type="primary"
                block
                onClick={handleTestBatch}
                loading={loading}
                disabled={selectedMeasures.length === 0}
              >
                Test Batch Calculation
              </Button>
              <Button
                block
                onClick={handleTestDependencyGraph}
                disabled={selectedMeasures.length === 0}
              >
                View Dependency Graph
              </Button>
              <Button
                type="default"
                block
                onClick={async () => {
                  if (!testContext.countryId || !testContext.skuId) {
                    setError('Please select a country and SKU');
                    return;
                  }
                  
                  setLoading(true);
                  setError(null);
                  setTestResults(null);
                  
                  try {
                    const filters = {};
                    const context = {
                      countryId: testContext.countryId,
                      skuId: testContext.skuId,
                      year: testContext.year,
                      month: testContext.month
                    };
                    
                    logger.debug('Testing all measures', { context, measureCount: availableMeasures.length });
                    
                    // Get dependency graph and execution plan for all measures
                    const dependencyGraph = registry.buildDependencyGraph(availableMeasures);
                    const executionOrder = registry.topologicalSort(dependencyGraph);
                    const levels = registry.groupByLevel(dependencyGraph, executionOrder);
                    
                    // Execute all measures in batch
                    const results = await StockCalculationService.executeBatch(availableMeasures, filters, context);
                    
                    setTestResults({
                      type: 'batch',
                      requestedMeasures: availableMeasures,
                      results,
                      dependencyGraph: Array.from(dependencyGraph.entries()).map(([key, deps]) => ({
                        key: key,
                        measure: key,
                        dependencies: Array.from(deps)
                      })),
                      executionOrder,
                      levels,
                      context
                    });
                    
                    logger.debug('All measures test completed', { measureCount: availableMeasures.length, results });
                    
                    // Show warning if all results are 0
                    const allZero = Object.values(results).every(r => r === 0 || (typeof r === 'number' && isNaN(r)));
                    if (allZero) {
                      setError('All measures returned 0. This might indicate: 1) No data matches the filters (check country/SKU/date), 2) docType filters excluding all records (check measure details for docType requirements), 3) Field name mismatch, or 4) Component filters excluding all records. Check the measure details to see the exact query and docType filters being applied.');
                    }
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    const errorStack = err instanceof Error ? err.stack : undefined;
                    logger.error('All measures test failed', { 
                      error: errorMessage,
                      stack: errorStack
                    });
                    setError(`Error testing all measures: ${errorMessage}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                loading={loading}
                disabled={!testContext.countryId || !testContext.skuId}
              >
                Test All Measures ({availableMeasures.length})
              </Button>
            </Space>
          </Space>
        </Card>

        {/* Selected Measure Details */}
        <Card 
          title={
            <div className="flex justify-between items-center">
              <span>
                {selectedMeasureForDetails 
                  ? `Measure Details: ${measureDetails[selectedMeasureForDetails]?.name || selectedMeasureForDetails}`
                  : selectedMeasures.length > 0
                  ? `Selected Measures (${selectedMeasures.length}) - Click a measure below to view details`
                  : 'Select Measures to View Details'}
              </span>
              {selectedMeasureForDetails && (
                <Button size="small" onClick={() => setSelectedMeasureForDetails(null)}>Close</Button>
              )}
            </div>
          }
          className="h-fit"
        >
          {selectedMeasureForDetails ? (
            (() => {
              const details = getMeasureDetails(selectedMeasureForDetails);
              if (!details) {
                return <Alert title="Measure not found" type="error" />;
              }

              return (
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Key">{details.key}</Descriptions.Item>
                    <Descriptions.Item label="Name">{details.name}</Descriptions.Item>
                    {details.category && (
                      <Descriptions.Item label="Category">{details.category}</Descriptions.Item>
                    )}
                    {details.unit && (
                      <Descriptions.Item label="Unit">{details.unit}</Descriptions.Item>
                    )}
                    {details.description && (
                      <Descriptions.Item label="Description" span={2}>
                        {details.description}
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {/* Test Context Summary */}
                  <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                    <Text strong className="text-sm text-yellow-800 mb-2 block">Test Context (Applied to all components):</Text>
                    <div className="space-y-1 text-xs">
                      {testContext.countryId ? (
                        <div>
                          <Text type="secondary">Country: </Text>
                          <Text strong>{selectedCountry?.name || testContext.countryId}</Text>
                          <Text type="secondary" className="ml-1">({testContext.countryId})</Text>
                        </div>
                      ) : (
                        <div>
                          <Text type="secondary" className="text-red-600">⚠ No country selected</Text>
                        </div>
                      )}
                      {testContext.skuId ? (
                        <div>
                          <Text type="secondary">SKU: </Text>
                          <Text strong>{selectedSku?.name || testContext.skuId}</Text>
                          <Text type="secondary" className="ml-1">({testContext.skuId})</Text>
                        </div>
                      ) : (
                        <div>
                          <Text type="secondary" className="text-red-600">⚠ No SKU selected</Text>
                        </div>
                      )}
                      {testContext.year && testContext.month ? (
                        <div>
                          <Text type="secondary">Period: </Text>
                          <Text strong>{testContext.year}-{String(testContext.month).padStart(2, '0')}</Text>
                        </div>
                      ) : (
                        <div>
                          <Text type="secondary" className="text-red-600">⚠ No period selected</Text>
                        </div>
                      )}
                    </div>
                  </div>

                  <Divider>Measure Structure</Divider>

                  <div className="space-y-3">
                    <Text strong>Formula Components ({details.components.length}):</Text>
                    {details.components.map((comp, idx) => {
                      const componentEditKey = `${selectedMeasureForDetails}_${idx}`;
                      const isEditingQuery = editingQuery === componentEditKey;
                      const editedQuery = editedQueries[componentEditKey] || comp.odataFilterQuery || '';
                      
                      return (
                      <Card key={comp.index} size="small" className="bg-gray-50">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Text strong>
                              Component {comp.index}: {comp.name}
                            </Text>
                            <Tag color={comp.sourceType === 'table' ? 'blue' : comp.sourceType === 'measure' ? 'green' : 'orange'}>
                              {comp.sourceType}
                            </Tag>
                          </div>

                          <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Sort Order">
                              {comp.sortOrder}
                            </Descriptions.Item>
                            <Descriptions.Item label="Operation">
                              <Tag>{comp.operation}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Data Source">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Text code>{comp.columnInfo || 'N/A'}</Text>
                                </div>
                                {comp.sourceType === 'table' && (
                                  <>
                                    {comp.tableName && (
                                      <div>
                                        <Text type="secondary" className="text-xs">
                                          Table: <Text code>{comp.tableName}</Text>
                                        </Text>
                                      </div>
                                    )}
                                    {comp.dataverseColumn && (
                                      <div>
                                        <Text type="secondary" className="text-xs">
                                          Dataverse Column: <Text code>{comp.dataverseColumn}</Text>
                                        </Text>
                                      </div>
                                    )}
                                    {comp.fieldName && (
                                      <div>
                                        <Text type="secondary" className="text-xs">
                                          Field Name: <Text code>{comp.fieldName}</Text>
                                        </Text>
                                      </div>
                                    )}
                                    <div>
                                      <Text type="secondary" className="text-xs">
                                        Aggregation: <Tag size="small">{comp.aggregation}</Tag>
                                      </Text>
                                    </div>
                                    {comp.dateColumnInfo && (
                                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                        <Text strong className="text-xs text-blue-700">Date Filtering Column:</Text>
                                        <div className="mt-1 space-y-1">
                                          <div>
                                            <Text type="secondary" className="text-xs">
                                              Friendly Name: <Text code className="text-xs">{comp.dateColumnInfo.friendlyName}</Text>
                                            </Text>
                                          </div>
                                          <div>
                                            <Text type="secondary" className="text-xs">
                                              Dataverse Column: <Text code className="text-xs font-bold">{comp.dateColumnInfo.dataverseName}</Text>
                                            </Text>
                                          </div>
                                          {comp.dateColumnInfo.isCustom && (
                                            <div>
                                              <Tag size="small" color="orange" className="text-xs">
                                                Custom Date Field (from Time Intelligence)
                                              </Tag>
                                            </div>
                                          )}
                                          {comp.timeIntelligence && (
                                            <div className="mt-1">
                                              <Text type="secondary" className="text-xs">
                                                Time Intelligence will filter using: <Text code className="text-xs">{comp.dateColumnInfo.dataverseName}</Text>
                                              </Text>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {comp.appliedFilters && comp.appliedFilters.length > 0 && (
                                      <div className="mt-2 p-2 bg-green-50 rounded border border-green-300">
                                        <Text strong className="text-xs text-green-700">Applied Filters (from Test Context):</Text>
                                        <div className="mt-1 space-y-2">
                                          {comp.appliedFilters.map((filter, fIdx) => (
                                            <div key={fIdx} className="p-1 bg-white rounded border border-green-200">
                                              <div className="flex items-center justify-between mb-1">
                                                <Text strong className="text-xs text-green-800">{filter.label}:</Text>
                                                {filter.timeIntelligence && (
                                                  <Tag size="small" color="orange" className="text-xs">
                                                    {filter.timeIntelligence}
                                                  </Tag>
                                                )}
                                              </div>
                                              <div className="space-y-1">
                                                <div>
                                                  <Text type="secondary" className="text-xs">
                                                    Dataverse Column: <Text code className="text-xs font-bold">{filter.column}</Text>
                                                    {filter.friendlyColumn && (
                                                      <Text type="secondary" className="text-xs"> (friendly: {filter.friendlyColumn})</Text>
                                                    )}
                                                  </Text>
                                                </div>
                                                <div>
                                                  <Text type="secondary" className="text-xs">
                                                    Value: <Text strong className="text-xs">{filter.displayValue}</Text>
                                                  </Text>
                                                </div>
                                                {filter.type === 'date' && filter.value && (
                                                  <>
                                                    <div className="text-xs">
                                                      <Text type="secondary">Date Range: </Text>
                                                      <Text code className="text-xs">{filter.value.start}</Text>
                                                      <Text type="secondary"> to </Text>
                                                      <Text code className="text-xs">{filter.value.end}</Text>
                                                    </div>
                                                    {filter.note && (
                                                      <div className="text-xs text-blue-600 italic">
                                                        ℹ️ {filter.note}
                                                      </div>
                                                    )}
                                                  </>
                                                )}
                                                {filter.odataFilter && (
                                                  <div className="mt-1 p-1 bg-gray-100 rounded text-xs">
                                                    <Text type="secondary" className="text-xs">OData: </Text>
                                                    <Text code className="text-xs break-all">{filter.odataFilter}</Text>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {comp.odataFilterQuery && (
                                      <div className="mt-2 p-2 bg-purple-50 rounded border border-purple-300">
                                        <div className="flex items-center justify-between mb-2">
                                          <Text strong className="text-xs text-purple-700">Complete OData Filter Query:</Text>
                                          <Button 
                                            size="small" 
                                            type="primary"
                                            icon={<span>✏️</span>}
                                            onClick={() => setEditingQuery(isEditingQuery ? null : componentEditKey)}
                                          >
                                            {isEditingQuery ? 'Cancel' : 'Edit Query'}
                                          </Button>
                                        </div>
                                        {isEditingQuery ? (
                                          <Input.TextArea
                                            value={editedQuery}
                                            onChange={(e) => setEditedQueries({ ...editedQueries, [componentEditKey]: e.target.value })}
                                            rows={6}
                                            className="font-mono text-xs"
                                            placeholder="Edit OData query..."
                                          />
                                        ) : (
                                          <div className="p-2 bg-white rounded border border-purple-200">
                                            <Text code className="text-xs break-all font-mono">{comp.odataFilterQuery}</Text>
                                          </div>
                                        )}
                                        {isEditingQuery && (
                                          <div className="mt-2 flex gap-2">
                                            <Button 
                                              size="small" 
                                              type="primary"
                                              onClick={() => {
                                                navigator.clipboard.writeText(editedQuery);
                                                showMessage('Query copied to clipboard!', 'success');
                                              }}
                                            >
                                              Copy Query
                                            </Button>
                                            <Button 
                                              size="small"
                                              onClick={() => {
                                                setEditedQueries({ ...editedQueries, [componentEditKey]: comp.odataFilterQuery });
                                                setEditingQuery(null);
                                              }}
                                            >
                                              Reset
                                            </Button>
                                          </div>
                                        )}
                                        <div className="mt-1">
                                          <Text strong className="text-xs text-purple-700 mb-1 block">Full Query URL:</Text>
                                          <div className="p-2 bg-white rounded border border-purple-200">
                                            <Text code className="text-xs break-all font-mono text-blue-600">{comp.fullODataQuery}</Text>
                                          </div>
                                        </div>
                                        <div className="mt-1 text-xs text-purple-600">
                                          <Text>ℹ️ Note: All date ranges use ge (first day of month) and lt (first day of next month).</Text>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                                {comp.sourceType === 'measure' && comp.measureKey && (
                                  <div>
                                    <Text type="secondary" className="text-xs">
                                      Depends on measure: <Text code>{comp.measureKey}</Text>
                                    </Text>
                                  </div>
                                )}
                              </div>
                            </Descriptions.Item>
                            {comp.filters && comp.filters.conditions && comp.filters.conditions.length > 0 && (
                              <Descriptions.Item label="Component Filters (Applied After Fetching Data)">
                                <div className="space-y-2">
                                  <div className="p-2 bg-orange-50 rounded border border-orange-200">
                                    <Text strong className="text-xs text-orange-700 mb-1 block">
                                      ⚠️ Important: These filters are applied in JavaScript after fetching data from Dataverse
                                    </Text>
                                    <Text type="secondary" className="text-xs">
                                      docType filters use numeric option set values for filtering, but display names for visual aid.
                                    </Text>
                                  </div>
                                  <div className="space-y-1">
                                    <Text type="secondary" className="text-xs">
                                      Logic: <Tag size="small">{comp.filters.logic}</Tag>
                                    </Text>
                                    {comp.filters.conditions.map((filter, fIdx) => {
                                      const filterInfo = comp.filterInfo?.[fIdx] || {};
                                      return (
                                        <div key={fIdx} className="text-xs p-1 bg-white rounded border border-orange-200">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Tag size="small" color={filter.column === 'docType' ? 'red' : 'purple'}>
                                              {filter.column} {filter.operator} {filterInfo.displayName || (filter.value !== undefined ? String(filter.value) : filter.values ? filter.values.join(', ') : '')}
                                            </Tag>
                                            {filter.column === 'docType' && (
                                              <>
                                                <Tag size="small" color="orange">
                                                  Critical Filter
                                                </Tag>
                                                {filterInfo.numericValue !== null && filterInfo.numericValue !== undefined && (
                                                  <Tag size="small" color="blue">
                                                    Value: {filterInfo.numericValue}
                                                  </Tag>
                                                )}
                                              </>
                                            )}
                                          </div>
                                          {filter.column === 'docType' && (
                                            <Text type="secondary" className="text-xs italic text-blue-600">
                                              ℹ️ Filtering by numeric option set value ({filterInfo.numericValue !== null && filterInfo.numericValue !== undefined ? filterInfo.numericValue : 'N/A'}) for reliability. Display name: "{filterInfo.displayName || String(filter.value)}" is shown for visual aid only.
                                            </Text>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </Descriptions.Item>
                            )}
                            {comp.timeIntelligence && (
                              <Descriptions.Item label="Time Intelligence">
                                <div className="space-y-1">
                                  <Tag size="small">{comp.timeIntelligence.type}</Tag>
                                  {comp.timeIntelligence.periods && (
                                    <Text type="secondary" className="text-xs">
                                      Periods: {comp.timeIntelligence.periods}
                                    </Text>
                                  )}
                                  {comp.timeIntelligence.dateField && (
                                    <div>
                                      <Text type="secondary" className="text-xs">
                                        Custom Date Field: <Text code className="text-xs">{comp.timeIntelligence.dateField}</Text>
                                      </Text>
                                    </div>
                                  )}
                                  {comp.dateColumnInfo && (
                                    <div className="mt-1 p-1 bg-yellow-50 rounded">
                                      <Text type="secondary" className="text-xs">
                                        Will filter by: <Text code className="text-xs font-bold">{comp.dateColumnInfo.dataverseName}</Text>
                                      </Text>
                                    </div>
                                  )}
                                </div>
                              </Descriptions.Item>
                            )}
                            {comp.conditionalInfo && (
                              <Descriptions.Item label="Conditional Logic">
                                <div className="space-y-1">
                                  <Text type="secondary" className="text-xs">
                                    Conditions: {JSON.stringify(comp.conditionalInfo.conditions)}
                                  </Text>
                                  <div>
                                    <Text type="secondary" className="text-xs">
                                      Primary: {comp.conditionalInfo.primary}
                                    </Text>
                                  </div>
                                  <div>
                                    <Text type="secondary" className="text-xs">
                                      Fallback: {comp.conditionalInfo.fallback}
                                    </Text>
                                  </div>
                                </div>
                              </Descriptions.Item>
                            )}
                          </Descriptions>
                        </div>
                      </Card>
                      );
                    })}
                  </div>

                  {details.timeIntelligence && (
                    <>
                      <Divider>Measure-Level Time Intelligence</Divider>
                      <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Type">
                          <Tag>{details.timeIntelligence.type}</Tag>
                        </Descriptions.Item>
                        {details.timeIntelligence.periods && (
                          <Descriptions.Item label="Periods">
                            {details.timeIntelligence.periods}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </>
                  )}
                </div>
              );
            })()
          ) : selectedMeasures.length > 0 ? (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              <Text>Click a measure below to view its details:</Text>
              
              {/* Separate Single and Dependent Measures */}
              {(() => {
                const singleMeasures = selectedMeasures.filter(m => !measureDetails[m]?.isDependent);
                const dependentMeasures = selectedMeasures.filter(m => measureDetails[m]?.isDependent);
                
                return (
                  <div className="space-y-4">
                    {singleMeasures.length > 0 && (
                      <div>
                        <Text strong className="text-sm mb-2 block">Single Measures (Table-based)</Text>
                        <div className="space-y-2">
                          {singleMeasures.map(measureKey => {
                            const details = measureDetails[measureKey];
                            return (
                              <Card
                                key={measureKey}
                                size="small"
                                hoverable
                                onClick={() => setSelectedMeasureForDetails(measureKey)}
                                className="cursor-pointer"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <Text strong>{details?.name || measureKey}</Text>
                                    <div>
                                      <Text type="secondary" className="text-xs">{measureKey}</Text>
                                    </div>
                                  </div>
                                  <Button size="small" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMeasureForDetails(measureKey);
                                  }}>
                                    View Details
                                  </Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {dependentMeasures.length > 0 && (
                      <div>
                        <Text strong className="text-sm mb-2 block">Dependent Measures (Use other measures)</Text>
                        <div className="space-y-2">
                          {dependentMeasures.map(measureKey => {
                            const details = measureDetails[measureKey];
                            return (
                              <Card
                                key={measureKey}
                                size="small"
                                hoverable
                                onClick={() => setSelectedMeasureForDetails(measureKey)}
                                className="cursor-pointer"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <Text strong>{details?.name || measureKey}</Text>
                                    <div>
                                      <Text type="secondary" className="text-xs">{measureKey}</Text>
                                      {details?.dependencies?.length > 0 && (
                                        <div className="mt-1">
                                          <Text type="secondary" className="text-xs">
                                            Depends on: {details.dependencies.map(d => (
                                              <Tag key={d} size="small" className="ml-1">{d}</Tag>
                                            ))}
                                          </Text>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Button size="small" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMeasureForDetails(measureKey);
                                  }}>
                                    View Details
                                  </Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-8">
              <Text type="secondary">
                Select measures from the dropdown above to test and view their detailed structure and data sources.
              </Text>
            </div>
          )}
        </Card>
      </div>


      {/* Results Panel */}
      {testResults && (
        <Card title="Test Results" className="mt-6">
          <Spin spinning={loading}>
            {testResults.type === 'single' && (
              <div className="space-y-4">
                <Title level={4}>Single Measure: {testResults.measureKey}</Title>
                <Alert
                  title="Result"
                  description={
                    <div>
                      <Text strong>Value: </Text>
                      {testResults.result !== null && testResults.result !== undefined ? (
                        typeof testResults.result === 'number' ? (
                          isNaN(testResults.result) ? (
                            <Tag color="red">NaN</Tag>
                          ) : (
                            <Text>{testResults.result.toLocaleString()}</Text>
                          )
                        ) : (
                          <Text>{String(testResults.result)}</Text>
                        )
                      ) : (
                        <Text type="secondary">null</Text>
                      )}
                    </div>
                  }
                  type={testResults.result === 0 ? "warning" : "success"}
                  showIcon
                />
                
                {debugInfo && (
                  <div className="space-y-3">
                    <Divider>Debug Information</Divider>
                    {debugInfo.components.map((comp, idx) => {
                      const editKey = `${testResults.measureKey}_${idx}`;
                      const isEditing = editingQuery === editKey;
                      const editedQuery = editedQueries[editKey] || comp.query || '';
                      
                      return (
                        <Card key={idx} size="small" className="bg-blue-50">
                          <Title level={5} className="mb-3">Component: {comp.componentName}</Title>
                          
                          {comp.error ? (
                            <div className="space-y-3">
                              <Alert title="Error" description={comp.error} type="error" />
                              {comp.query && (
                                <div className="border rounded-lg p-3 bg-red-50">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <Text strong className="text-red-800">Failed Query:</Text>
                                    <Button 
                                      size="small" 
                                      type="primary"
                                      danger
                                      icon={<span>✏️</span>}
                                      onClick={() => setEditingQuery(isEditing ? null : editKey)}
                                    >
                                      {isEditing ? 'Cancel Edit' : 'Edit Query'}
                                    </Button>
                                  </div>
                                  {isEditing ? (
                                    <Input.TextArea
                                      value={editedQuery}
                                      onChange={(e) => setEditedQueries({ ...editedQueries, [editKey]: e.target.value })}
                                      rows={6}
                                      className="font-mono text-xs"
                                      placeholder="Edit OData query..."
                                    />
                                  ) : (
                                    <div className="bg-white p-2 rounded border border-red-200">
                                      <Text code className="text-xs break-all whitespace-pre-wrap text-red-700">{comp.query}</Text>
                                    </div>
                                  )}
                                  {isEditing && (
                                    <div className="mt-2 flex gap-2">
                                      <Button 
                                        size="small" 
                                        type="primary"
                                        onClick={() => {
                                          navigator.clipboard.writeText(editedQuery);
                                          showMessage('Query copied to clipboard!', 'success');
                                        }}
                                      >
                                        Copy Query
                                      </Button>
                                      <Button 
                                        size="small"
                                        onClick={() => {
                                          setEditedQueries({ ...editedQueries, [editKey]: comp.query });
                                          setEditingQuery(null);
                                        }}
                                      >
                                        Reset
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <Text strong>Table: </Text>
                                <Text code>{comp.tableName}</Text>
                              </div>
                              <div className="border rounded-lg p-3 bg-white">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <Text strong className="whitespace-nowrap">OData Query:</Text>
                                  <Button 
                                    size="small" 
                                    type="primary"
                                    icon={<span>✏️</span>}
                                    onClick={() => setEditingQuery(isEditing ? null : editKey)}
                                  >
                                    {isEditing ? 'Cancel Edit' : 'Edit Query'}
                                  </Button>
                                </div>
                                {isEditing ? (
                                  <Input.TextArea
                                    value={editedQuery}
                                    onChange={(e) => setEditedQueries({ ...editedQueries, [editKey]: e.target.value })}
                                    rows={8}
                                    className="font-mono text-xs"
                                    placeholder="Edit OData query..."
                                  />
                                ) : (
                                  <div className="bg-gray-50 p-2 rounded border">
                                    <Text code className="text-xs break-all whitespace-pre-wrap">{comp.query || 'No query'}</Text>
                                  </div>
                                )}
                                {isEditing && (
                                  <div className="mt-2 flex gap-2">
                                    <Button 
                                      size="small" 
                                      type="primary"
                                      onClick={() => {
                                        navigator.clipboard.writeText(editedQuery);
                                        showMessage('Query copied to clipboard!', 'success');
                                      }}
                                    >
                                      Copy Query
                                    </Button>
                                    <Button 
                                      size="small"
                                      onClick={() => {
                                        setEditedQueries({ ...editedQueries, [editKey]: comp.query });
                                        setEditingQuery(null);
                                      }}
                                    >
                                      Reset to Original
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <Descriptions bordered column={2} size="small">
                                <Descriptions.Item label="Raw Records">
                                  {comp.rawRecordsCount}
                                </Descriptions.Item>
                                <Descriptions.Item label="After Transformation">
                                  {comp.transformedRecordsCount}
                                </Descriptions.Item>
                                <Descriptions.Item label="After Filters">
                                  {comp.filteredRecordsCount}
                                </Descriptions.Item>
                                <Descriptions.Item label="Field Name">
                                  <Text code>{comp.fieldName}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Values Found">
                                  {comp.totalValues}
                                </Descriptions.Item>
                                <Descriptions.Item label="Sum">
                                  {comp.sum.toLocaleString()}
                                </Descriptions.Item>
                              </Descriptions>
                            
                            {comp.values.length > 0 && (
                              <div>
                                <Text strong className="text-xs">Sample Values (first 10):</Text>
                                <div className="mt-1">
                                  {comp.values.map((v, i) => (
                                    <Tag key={i} className="mr-1 mb-1">{v}</Tag>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {comp.sampleRecords.length > 0 && (
                              <div>
                                <Text strong className="text-xs">Sample Records:</Text>
                                <Table
                                  size="small"
                                  dataSource={comp.sampleRecords.map((r, i) => ({ key: i, ...r }))}
                                  columns={Object.keys(comp.sampleRecords[0] || {}).map(key => ({
                                    title: key,
                                    dataIndex: key,
                                    key: key,
                                    render: (val) => val !== null && val !== undefined ? String(val) : '-'
                                  }))}
                                  pagination={false}
                                />
                              </div>
                            )}
                            
                            {comp.filteredRecordsCount === 0 && (
                              <Alert
                                title="No Records Found"
                                description="No records match the filters. Check: 1) Country/SKU selection, 2) Date range, 3) Component filters (docType, etc.)"
                                type="warning"
                                showIcon
                              />
                            )}
                          </div>
                        )}
                      </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {testResults.type === 'batch' && (
              <div className="space-y-4">
                <Title level={4}>Batch Calculation Results</Title>
                
                <div>
                  <Text strong>Requested Measures: </Text>
                  {testResults.requestedMeasures.map(m => (
                    <Tag key={m} color="blue">{m}</Tag>
                  ))}
                </div>

                <Table
                  columns={resultsColumns}
                  dataSource={Object.entries(testResults.results || {}).map(([measure, result]) => ({
                    key: measure,
                    measure,
                    result
                  }))}
                  pagination={false}
                  size="small"
                />
                
                {Object.values(testResults.results || {}).every(r => r === 0 || (typeof r === 'number' && isNaN(r))) && (
                  <Alert
                    title="All Results Are Zero"
                    description={
                      <div className="space-y-2">
                        <Text>All measures returned 0. Possible reasons:</Text>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>No data exists for the selected Country/SKU/Date combination</li>
                          <li>Component filters (e.g., docType) are excluding all records</li>
                          <li>Field name mismatch - check if the field exists in the table</li>
                          <li>Date range might be outside available data range</li>
                        </ul>
                        <Text strong className="mt-2 block">To debug:</Text>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>Select a measure and click "View Details" to see the exact query</li>
                          <li>Check the OData query URL shown in the details</li>
                          <li>Verify the Country ID and SKU ID are correct</li>
                          <li>Try a different date range or check what dates have data</li>
                        </ul>
                      </div>
                    }
                    type="warning"
                    showIcon
                  />
                )}

                <Divider />

                <Title level={5}>Dependency Graph</Title>
                <Table
                  columns={dependencyColumns}
                  dataSource={testResults.dependencyGraph}
                  pagination={false}
                  size="small"
                />

                <Divider />

                <div>
                  <Title level={5}>Execution Order</Title>
                  <div className="space-y-1">
                    {testResults.executionOrder.map((measure, idx) => (
                      <Tag key={measure} color={idx === 0 ? 'green' : 'default'}>
                        {idx + 1}. {measure}
                      </Tag>
                    ))}
                  </div>
                </div>

                <Divider />

                <div>
                  <Title level={5}>Execution Levels (for parallel processing)</Title>
                  {testResults.levels.map((level, levelIdx) => (
                    <div key={levelIdx} className="mb-2">
                      <Text strong>Level {levelIdx + 1}: </Text>
                      {level.map(measure => (
                        <Tag key={measure} color="purple">{measure}</Tag>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {testResults.type === 'dependency' && (
              <div className="space-y-4">
                <Title level={4}>Dependency Graph Analysis</Title>
                
                <div>
                  <Text strong>Requested Measures: </Text>
                  {testResults.requestedMeasures.map(m => (
                    <Tag key={m} color="blue">{m}</Tag>
                  ))}
                </div>

                <Table
                  columns={dependencyColumns}
                  dataSource={testResults.dependencyGraph}
                  pagination={false}
                  size="small"
                />

                <Divider />

                <div>
                  <Title level={5}>Execution Order</Title>
                  <div className="space-y-1">
                    {testResults.executionOrder.map((measure, idx) => (
                      <Tag key={measure} color={idx === 0 ? 'green' : 'default'}>
                        {idx + 1}. {measure}
                      </Tag>
                    ))}
                  </div>
                </div>

                <Divider />

                <div>
                  <Title level={5}>Execution Levels</Title>
                  {testResults.levels.map((level, levelIdx) => (
                    <div key={levelIdx} className="mb-2">
                      <Text strong>Level {levelIdx + 1}: </Text>
                      {level.map(measure => (
                        <Tag key={measure} color="purple">{measure}</Tag>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Spin>
        </Card>
      )}

    </div>
  );
}
