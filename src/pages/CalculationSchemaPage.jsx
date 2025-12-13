import { useState, useEffect } from 'react';
import { registry } from '@/schema/registry.js';

/**
 * Calculation Schema Page
 * Displays the calculation schema types and definitions in a readable format
 */
const CalculationSchemaPage = () => {
  const [activeTab, setActiveTab] = useState('types');
  const [expandedSections, setExpandedSections] = useState(new Set(['types']));
  const [measures, setMeasures] = useState([]);

  useEffect(() => {
    try {
      const allMeasures = registry.getAll();
      setMeasures(allMeasures);
    } catch (error) {
      console.error('Failed to load measures:', error);
    }
  }, []);

  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const schemaTypes = {
    'Aggregation Types': {
      type: 'type',
      definition: `type AggregationType = 
  | 'sum' 
  | 'count' 
  | 'countDistinct' 
  | 'average' 
  | 'avg' 
  | 'min' 
  | 'max';`,
      description: 'Functions used to aggregate data from tables'
    },
    'Operation Types': {
      type: 'type',
      definition: `type OperationType = 
  | 'sum'      // Default: sum all components
  | 'add'      // Add component to result
  | 'subtract' // Subtract component from result
  | 'multiply' // Multiply result by component
  | 'divide'   // Divide result by component
  | 'fallback' // Use first valid (non-zero) component, fallback to second
  | 'conditional'; // Conditional logic based on conditions`,
      description: 'Operations for combining measure components'
    },
    'Filter Operators': {
      type: 'type',
      definition: `type FilterOperator = 
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull';`,
      description: 'Operators for filtering data in measure components'
    },
    'Time Intelligence Types': {
      type: 'type',
      definition: `type TimeIntelligenceType = 
  | 'sameperiodlastyear'  // Same period last year (SPLY)
  | 'ytd'                  // Year-to-date
  | 'rolling'              // Rolling average (N months)
  | 'forward'              // Forward-looking (N months ahead)
  | 'lastyear'             // Last year (full year)
  | 'pastlastyear';        // Past last year (2 years ago)`,
      description: 'Time intelligence functions for temporal calculations'
    },
    'Filter Condition': {
      type: 'interface',
      definition: `interface FilterCondition {
  id?: string;
  column: string;
  operator: FilterOperator;
  value?: string | number | boolean | null;
  values?: Array<string | number>; // For 'in' and 'notIn' operators
}`,
      description: 'Single filter condition for data filtering'
    },
    'Filter Logic': {
      type: 'interface',
      definition: `interface FilterLogic {
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
}`,
      description: 'Combination of filter conditions with AND/OR logic'
    },
    'Conditional Config': {
      type: 'interface',
      definition: `interface ConditionalConfig {
  conditions: {
    hasData?: boolean;        // Check if data exists
    isPastMonth?: boolean;    // Check if month is in the past
    isFutureMonth?: boolean;  // Check if month is in the future
    isCurrentMonth?: boolean; // Check if month is current
  };
  primarySource: ComponentSource;   // Source to use if conditions match
  fallbackSource: ComponentSource;  // Source to use if conditions don't match
}`,
      description: 'Configuration for conditional data source selection'
    },
    'Component Source': {
      type: 'interface',
      definition: `interface ComponentSource {
  type: 'table' | 'measure' | 'conditional';
  // For table source
  tableKey?: string;          // Dataverse table key (e.g., 'rawAggregated', 'forecasts')
  fieldName?: string;         // Field name to aggregate (e.g., 'quantity', 'forecastQty')
  quantityField?: string;    // Alternative field name for quantity (default: 'quantity')
  // For measure source
  measureKey?: string;        // Reference to another measure
  // For conditional source (uses conditionalConfig)
}`,
      description: 'Source configuration for measure components (table data or other measures)'
    },
    'Measure Component': {
      type: 'interface',
      definition: `interface MeasureComponent {
  id: string;
  name: string;
  source: ComponentSource;
  operation?: OperationType;        // How this component combines with previous
  aggregation?: AggregationType;    // Aggregation function (default: 'sum')
  filters?: FilterLogic;            // Filter conditions
  sortOrder: number;                 // Order of execution
  conditionalConfig?: ConditionalConfig; // For conditional source types
  timeIntelligence?: TimeIntelligence;   // Time intelligence for this component
  metadata?: {
    description?: string;
    [key: string]: any;
  };
}`,
      description: 'Single component of a calculation measure'
    },
    'Measure Threshold': {
      type: 'interface',
      definition: `interface MeasureThreshold {
  key: string;
  name: string;
  value: number;
  operator?: 'greaterThan' | 'lessThan' | 'equals' | 'greaterThanOrEqual' | 'lessThanOrEqual';
  description?: string;
}`,
      description: 'Threshold configuration for measure validation'
    },
    'Measure Metadata': {
      type: 'interface',
      definition: `interface MeasureMetadata {
  category?: string;
  unit?: string;
  tags?: string[];
  version?: string;
  thresholds?: MeasureThreshold[];
  [key: string]: any;
}`,
      description: 'Metadata associated with a calculation measure'
    },
    'Calculation Measure': {
      type: 'interface',
      definition: `interface CalculationMeasure {
  key: string;
  name: string;
  description?: string;
  components: MeasureComponent[];
  metadata?: MeasureMetadata;
  timeIntelligence?: TimeIntelligence; // Time intelligence for the entire measure
}`,
      description: 'Top-level structure representing a complete calculation measure'
    },
    'Time Intelligence': {
      type: 'interface',
      definition: `interface TimeIntelligence {
  type: TimeIntelligenceType;
  periods?: number;         // For rolling/forward: number of periods
  dateField?: string;       // Date field to use (default: 'date')
  startDate?: string;       // Custom start date
  endDate?: string;         // Custom end date
}`,
      description: 'Time intelligence configuration for temporal calculations'
    },
    'Execution Context': {
      type: 'interface',
      definition: `interface ExecutionContext {
  countryId?: string;
  skuId?: string;
  year?: number;
  month?: number;
  date?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  timeIntelligence?: TimeIntelligence;
  [key: string]: any;
}`,
      description: 'Context for measure calculation execution'
    },
    'Execution Filters': {
      type: 'interface',
      definition: `interface ExecutionFilters {
  [key: string]: string | number | boolean | Array<string | number> | null;
}`,
      description: 'Additional filters for measure execution'
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">Calculation Schema</h1>
            <p className="text-sm text-gray-600 mt-1">
              TypeScript type definitions and interfaces for calculation measures
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('types')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'types'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Type Definitions
              </button>
              <button
                onClick={() => setActiveTab('measures')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'measures'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Registered Measures ({measures.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'types' && (
              <div className="space-y-4">
                {Object.entries(schemaTypes).map(([name, info]) => {
                  const isExpanded = expandedSections.has(name);
                  return (
                    <div
                      key={name}
                      className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                    >
                      <button
                        onClick={() => toggleSection(name)}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          <div className="text-left">
                            <div className="font-semibold text-gray-900">{name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{info.description}</div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {info.type}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="p-4 bg-gray-900 text-gray-100 font-mono text-sm overflow-x-auto">
                          <pre className="whitespace-pre-wrap">{info.definition}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'measures' && (
              <div className="space-y-4">
                {measures.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No measures loaded. Check console for errors.
                  </div>
                ) : (
                  measures.map((measure) => {
                    const isExpanded = expandedSections.has(measure.key);
                    return (
                      <div
                        key={measure.key}
                        className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                      >
                        <button
                          onClick={() => toggleSection(measure.key)}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                              ▶
                            </span>
                            <div className="text-left">
                              <div className="font-semibold text-gray-900">{measure.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5 font-mono">
                                {measure.key}
                              </div>
                              {measure.description && (
                                <div className="text-xs text-gray-600 mt-1">{measure.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                              {measure.components.length} component{measure.components.length !== 1 ? 's' : ''}
                            </span>
                            {measure.metadata?.category && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                {measure.metadata.category}
                              </span>
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="p-4 space-y-4 bg-gray-50">
                            {/* Measure Info */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Measure Details</h4>
                              <div className="bg-white p-3 rounded border border-gray-200 text-sm space-y-1">
                                <div><span className="font-medium">Key:</span> <code className="text-blue-600">{measure.key}</code></div>
                                <div><span className="font-medium">Name:</span> {measure.name}</div>
                                {measure.description && (
                                  <div><span className="font-medium">Description:</span> {measure.description}</div>
                                )}
                                {measure.metadata?.unit && (
                                  <div><span className="font-medium">Unit:</span> {measure.metadata.unit}</div>
                                )}
                                {measure.metadata?.category && (
                                  <div><span className="font-medium">Category:</span> {measure.metadata.category}</div>
                                )}
                              </div>
                            </div>

                            {/* Components */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Components ({measure.components.length})
                              </h4>
                              <div className="space-y-3">
                                {measure.components
                                  .sort((a, b) => a.sortOrder - b.sortOrder)
                                  .map((component, idx) => (
                                    <div key={component.id || idx} className="bg-white p-4 rounded border border-gray-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="font-medium text-gray-900">{component.name}</div>
                                        <div className="flex gap-2">
                                          {component.operation && (
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                              {component.operation}
                                            </span>
                                          )}
                                          {component.aggregation && (
                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                              {component.aggregation}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-sm space-y-1 text-gray-600">
                                        <div>
                                          <span className="font-medium">Source:</span>{' '}
                                          <code className="text-blue-600">{component.source.type}</code>
                                          {component.source.tableKey && (
                                            <span> → <code className="text-purple-600">{component.source.tableKey}</code></span>
                                          )}
                                          {component.source.fieldName && (
                                            <span>.<code className="text-purple-600">{component.source.fieldName}</code></span>
                                          )}
                                          {component.source.measureKey && (
                                            <span> → <code className="text-purple-600">{component.source.measureKey}</code></span>
                                          )}
                                        </div>
                                        {component.filters && (
                                          <div>
                                            <span className="font-medium">Filters:</span>{' '}
                                            <code className="text-orange-600">
                                              {component.filters.logic} ({component.filters.conditions.length} condition{component.filters.conditions.length !== 1 ? 's' : ''})
                                            </code>
                                          </div>
                                        )}
                                        {component.timeIntelligence && (
                                          <div>
                                            <span className="font-medium">Time Intelligence:</span>{' '}
                                            <code className="text-indigo-600">{component.timeIntelligence.type}</code>
                                            {component.timeIntelligence.periods && (
                                              <span> ({component.timeIntelligence.periods} periods)</span>
                                            )}
                                          </div>
                                        )}
                                        {component.metadata?.description && (
                                          <div className="text-gray-500 italic mt-1">
                                            {component.metadata.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* JSON View */}
                            <details className="mt-4">
                              <summary className="cursor-pointer font-semibold text-gray-900 mb-2">
                                Raw JSON
                              </summary>
                              <div className="bg-gray-900 p-4 rounded border border-gray-200 overflow-x-auto">
                                <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
                                  {JSON.stringify(measure, null, 2)}
                                </pre>
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculationSchemaPage;
