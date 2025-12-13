import { useState, useEffect } from 'react';
import { LoadingState } from '@/components/index.js';
import SchemaDiscoveryService from '@/services/SchemaDiscoveryService.js';
import { showMessage } from '@/utils/message.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('SchemaManagementPage');

/**
 * Schema Management Page
 * View current schema vs discovered schema, validate, and sync
 */
const SchemaManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [validation, setValidation] = useState(null);
  const [discoveredSchema, setDiscoveredSchema] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableDetails, setTableDetails] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await validateSchema();
    } catch (error) {
      logger.error('Failed to load initial data', error);
      showMessage('Failed to load schema data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateSchema = async () => {
    setValidating(true);
    try {
      const result = await SchemaDiscoveryService.validateSchema();
      setValidation(result);
      setComparison(result.comparison);
    } catch (error) {
      logger.error('Schema validation failed', error);
      showMessage('Schema validation failed', 'error');
    } finally {
      setValidating(false);
    }
  };

  const discoverSchema = async () => {
    setDiscovering(true);
    try {
      const schema = await SchemaDiscoveryService.discoverAllSchemas(false);
      setDiscoveredSchema(schema);
      const comp = SchemaDiscoveryService.compareWithCurrentSchema(schema);
      setComparison(comp);
      showMessage('Schema discovery completed', 'success');
    } catch (error) {
      logger.error('Schema discovery failed', error);
      showMessage('Schema discovery failed', 'error');
    } finally {
      setDiscovering(false);
    }
  };

  const loadTableDetails = async (tableLogicalName) => {
    try {
      const details = await SchemaDiscoveryService.discoverTableSchema(tableLogicalName);
      setTableDetails(details);
      setSelectedTable(tableLogicalName);
    } catch (error) {
      logger.error('Failed to load table details', error);
      showMessage('Failed to load table details', 'error');
    }
  };

  const exportSchema = () => {
    const data = {
      validation,
      comparison,
      discoveredSchema,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('Schema exported successfully', 'success');
  };

  if (loading) {
    return <LoadingState message="Loading schema information..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Schema Management</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Discover, validate, and sync Dataverse schema
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportSchema}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Export Schema
                </button>
                <button
                  onClick={discoverSchema}
                  disabled={discovering}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {discovering ? 'Discovering...' : 'Discover Schema'}
                </button>
                <button
                  onClick={validateSchema}
                  disabled={validating}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validating ? 'Validating...' : 'Validate Schema'}
                </button>
              </div>
            </div>
          </div>

          {/* Validation Status */}
          {validation && (
            <div className="p-6">
              <div className={`p-4 rounded-lg border ${
                validation.isValid 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {validation.isValid ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  <h3 className="font-semibold text-gray-900">
                    Schema {validation.isValid ? 'Valid' : 'Needs Attention'}
                  </h3>
                </div>
                {validation.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-800">Errors:</p>
                    <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                      {validation.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.warnings.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
                      {validation.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Comparison Results */}
        {comparison && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Tables */}
            {comparison.newTables.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">
                    New Tables ({comparison.newTables.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Tables found in Dataverse but not in current schema
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {comparison.newTables.map((table, idx) => (
                      <div
                        key={idx}
                        onClick={() => loadTableDetails(table.logicalName)}
                        className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div className="font-medium text-gray-900">{table.displayName}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {table.entitySetName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Missing Tables */}
            {comparison.missingTables.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-yellow-50 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">
                    Missing Tables ({comparison.missingTables.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Tables in schema but not found in Dataverse
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {comparison.missingTables.map((table, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                      >
                        <div className="font-medium text-gray-900">{table.schemaKey}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {table.tableName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* New Columns */}
            {Object.keys(comparison.newColumns).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-green-50 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">
                    New Columns ({Object.keys(comparison.newColumns).length} tables)
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Columns found in Dataverse but not in current schema
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {Object.entries(comparison.newColumns).map(([schemaKey, columns]) => (
                      <div key={schemaKey} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                        <div className="font-semibold text-gray-900 mb-2">{schemaKey}</div>
                        <div className="space-y-1">
                          {columns.map((col, idx) => (
                            <div key={idx} className="text-sm text-gray-700 font-mono pl-4">
                              + {col.logicalName} ({col.type})
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Missing Columns */}
            {Object.keys(comparison.missingColumns).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-red-50 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">
                    Missing Columns ({Object.keys(comparison.missingColumns).length} tables)
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Columns in schema but not found in Dataverse
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {Object.entries(comparison.missingColumns).map(([schemaKey, columns]) => (
                      <div key={schemaKey} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                        <div className="font-semibold text-gray-900 mb-2">{schemaKey}</div>
                        <div className="space-y-1">
                          {columns.map((col, idx) => (
                            <div key={idx} className="text-sm text-gray-700 font-mono pl-4">
                              - {col}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Table Details */}
        {tableDetails && selectedTable && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Table Details</h2>
                  <p className="text-sm text-gray-600 mt-1 font-mono">{selectedTable}</p>
                </div>
                <button
                  onClick={() => {
                    setTableDetails(null);
                    setSelectedTable(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columns */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Columns ({tableDetails.columns.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tableDetails.columns.map((col, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900 font-mono text-sm">
                            {col.logicalName}
                          </div>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {col.type}
                          </span>
                        </div>
                        {col.displayName && (
                          <div className="text-xs text-gray-500 mt-1">{col.displayName}</div>
                        )}
                        {col.isOptionSet && (
                          <div className="text-xs text-green-600 mt-1">Option Set</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lookups */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Lookups ({tableDetails.lookups.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tableDetails.lookups.map((lookup, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-gray-200">
                        <div className="text-sm font-medium text-gray-900">
                          {lookup.type === 'manyToOne' ? 'References' : 'Referenced By'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {lookup.type === 'manyToOne' 
                            ? lookup.referencedEntity 
                            : lookup.referencingEntity}
                        </div>
                        {lookup.navigationProperty && (
                          <div className="text-xs text-gray-400 mt-1">
                            via {lookup.navigationProperty}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!comparison && !validation && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 font-medium mb-2">No schema data loaded</p>
            <p className="text-sm text-gray-500 mb-4">Click "Discover Schema" or "Validate Schema" to get started</p>
            <button
              onClick={discoverSchema}
              disabled={discovering}
              className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {discovering ? 'Discovering...' : 'Discover Schema'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemaManagementPage;
