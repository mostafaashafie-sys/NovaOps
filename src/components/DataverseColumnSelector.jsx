import { useState, useEffect } from 'react';
import { Select, Card, Table, Tag, Input, Button, Space, Alert, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import DataverseDataService from '@/services/DataverseDataService.js';
import { getTableName, getTableSchema, DataverseSchema } from '@/config/dataverse-schema.js';
import { Logger } from '@/utils/index.js';

const logger = new Logger('DataverseColumnSelector');

/**
 * Dataverse Column Selector Component
 * Allows selecting actual columns from Dataverse tables with live connection
 */
const DataverseColumnSelector = ({ 
  value, 
  onChange, 
  tableKey: initialTableKey = null,
  multiple = false,
  showTableSelector = true,
  placeholder = "Select columns from Dataverse"
}) => {
  const [tableKey, setTableKey] = useState(initialTableKey);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedColumns, setSelectedColumns] = useState(value || []);

  // Get available tables from schema
  const availableTables = Object.keys(DataverseSchema).map(key => ({
    value: key,
    label: `${key} (${getTableName(key)})`
  }));

  // Load columns when table changes
  useEffect(() => {
    if (tableKey) {
      loadColumns(tableKey);
    } else {
      setColumns([]);
    }
  }, [tableKey]);

  // Update parent when selection changes
  useEffect(() => {
    if (onChange) {
      onChange(selectedColumns);
    }
  }, [selectedColumns]);

  const loadColumns = async (schemaKey) => {
    setLoading(true);
    setError(null);
    try {
      logger.debug(`Loading columns for table: ${schemaKey}`);
      
      // Fetch live columns from Dataverse
      const liveColumns = await DataverseDataService.getEntityColumns(schemaKey);
      
      // Also get schema columns for friendly name mapping
      const schema = getTableSchema(schemaKey);
      const schemaColumns = schema?.columns || {};
      
      // Create reverse mapping (dataverse -> friendly)
      const reverseMap = {};
      Object.entries(schemaColumns).forEach(([friendly, dataverse]) => {
        reverseMap[dataverse] = friendly;
      });
      
      // Combine live columns with schema info
      const enrichedColumns = liveColumns.map(col => ({
        logicalName: col.columnName,
        friendlyName: reverseMap[col.columnName] || col.columnName,
        displayName: col.name || col.columnName,
        type: col.type,
        isOptionSet: col.isOptionSet,
        optionSetName: col.optionSetName
      }));
      
      setColumns(enrichedColumns);
      logger.info(`Loaded ${enrichedColumns.length} columns for ${schemaKey}`);
    } catch (err) {
      logger.error('Failed to load columns', err);
      setError(err.message || 'Failed to load columns from Dataverse');
      setColumns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleColumnSelect = (selected) => {
    if (multiple) {
      setSelectedColumns(selected);
    } else {
      setSelectedColumns(selected ? [selected] : []);
    }
  };

  const handleColumnToggle = (column) => {
    if (multiple) {
      const isSelected = selectedColumns.some(c => 
        c.logicalName === column.logicalName || c === column.logicalName
      );
      if (isSelected) {
        setSelectedColumns(selectedColumns.filter(c => 
          c.logicalName !== column.logicalName && c !== column.logicalName
        ));
      } else {
        setSelectedColumns([...selectedColumns, {
          logicalName: column.logicalName,
          friendlyName: column.friendlyName,
          displayName: column.displayName,
          type: column.type
        }]);
      }
    } else {
      setSelectedColumns([{
        logicalName: column.logicalName,
        friendlyName: column.friendlyName,
        displayName: column.displayName,
        type: column.type
      }]);
    }
  };

  // Filter columns by search
  const filteredColumns = columns.filter(col => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      col.logicalName.toLowerCase().includes(search) ||
      col.friendlyName.toLowerCase().includes(search) ||
      (col.displayName && col.displayName.toLowerCase().includes(search))
    );
  });

  const tableColumns = [
    {
      title: 'Select',
      key: 'select',
      width: 80,
      render: (_, column) => {
        const isSelected = selectedColumns.some(c => 
          c.logicalName === column.logicalName || c === column.logicalName
        );
        return (
          <Button
            type={isSelected ? 'primary' : 'default'}
            icon={isSelected ? <CheckCircleOutlined /> : null}
            onClick={() => handleColumnToggle(column)}
            size="small"
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        );
      }
    },
    {
      title: 'Friendly Name',
      dataIndex: 'friendlyName',
      key: 'friendlyName',
      render: (text, record) => (
        <div>
          <div className="font-medium">{text || record.logicalName}</div>
          {text !== record.logicalName && (
            <div className="text-xs text-gray-500 font-mono">{record.logicalName}</div>
          )}
        </div>
      )
    },
    {
      title: 'Logical Name',
      dataIndex: 'logicalName',
      key: 'logicalName',
      render: (text) => <code className="text-xs">{text}</code>
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type, record) => (
        <Space>
          <Tag color={type === 'Decimal' || type === 'Money' ? 'blue' : 'default'}>
            {type}
          </Tag>
          {record.isOptionSet && (
            <Tag color="green">Option Set</Tag>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {showTableSelector && (
        <Card size="small">
          <Space direction="vertical" className="w-full" size="small">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Select Table
              </label>
              <Select
                className="w-full"
                placeholder="Select a table to view its columns"
                value={tableKey}
                onChange={setTableKey}
                options={availableTables}
                showSearch
                filterOption={(input, option) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>
            {tableKey && (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadColumns(tableKey)}
                loading={loading}
                size="small"
              >
                Refresh Columns
              </Button>
            )}
          </Space>
        </Card>
      )}

      {error && (
        <Alert
          message="Error Loading Columns"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
        />
      )}

      {tableKey && (
        <Card 
          title={
            <div className="flex items-center justify-between">
              <span>
                Columns from {tableKey} 
                {columns.length > 0 && ` (${columns.length} columns)`}
              </span>
              {loading && <Spin size="small" />}
            </div>
          }
          size="small"
        >
          <div className="mb-4">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search columns..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <Spin size="large" />
              <p className="mt-4 text-gray-500">Loading columns from Dataverse...</p>
            </div>
          ) : columns.length === 0 ? (
            <Alert
              message="No columns found"
              description="Select a table to view its columns, or click 'Refresh Columns' to reload."
              type="info"
              showIcon
            />
          ) : (
            <>
              <Table
                columns={tableColumns}
                dataSource={filteredColumns}
                rowKey="logicalName"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} columns`
                }}
                size="small"
                scroll={{ y: 400 }}
              />
              
              {selectedColumns.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    Selected Columns ({selectedColumns.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedColumns.map((col, idx) => {
                      const colName = typeof col === 'string' ? col : (col.friendlyName || col.logicalName);
                      return (
                        <Tag
                          key={idx}
                          closable
                          onClose={() => {
                            const newSelected = selectedColumns.filter((_, i) => i !== idx);
                            setSelectedColumns(newSelected);
                          }}
                          color="blue"
                        >
                          {colName}
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {!tableKey && showTableSelector && (
        <Alert
          message="Select a table"
          description="Please select a table from the dropdown above to view and select its columns."
          type="info"
          showIcon
        />
      )}
    </div>
  );
};

export default DataverseColumnSelector;
