import React, { useMemo } from 'react';
import { EnhancedConversionMap } from '../services/EnhancedConversionService';

interface DynamicTableProps {
  data: Array<Record<string, any>>;
  enhancedMap: EnhancedConversionMap;
  context?: string;
  onCellEdit?: (rowIndex: number, fieldName: string, value: any) => void;
  onRowSelect?: (selectedRows: number[]) => void;
}

interface TableColumn {
  fieldName: string;
  displayName: string;
  dataType: string;
  width: number;
  sortable: boolean;
  filterable: boolean;
  hidden: boolean;
  required: boolean;
}

export const DynamicTable: React.FC<DynamicTableProps> = ({
  data,
  enhancedMap,
  context,
  onCellEdit,
  onRowSelect
}) => {
  const [sortField, setSortField] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());

  const columns = useMemo(() => {
    const tableColumns: TableColumn[] = [];
    
    for (const [fieldName, fieldDef] of Object.entries(enhancedMap.field_definitions)) {
      // Skip hidden fields unless in debug context
      if (fieldDef.ui_config?.hidden && context !== 'debug') {
        continue;
      }

      const column: TableColumn = {
        fieldName,
        displayName: fieldDef.display_name,
        dataType: fieldDef.data_type,
        width: fieldDef.ui_config?.column_width || 150,
        sortable: fieldDef.ui_config?.sortable !== false,
        filterable: fieldDef.ui_config?.filterable !== false,
        hidden: fieldDef.ui_config?.hidden || false,
        required: fieldDef.is_required
      };

      tableColumns.push(column);
    }

    // Sort columns by priority: required fields first, then by display name
    return tableColumns.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [enhancedMap, context]);

  const sortedAndFilteredData = useMemo(() => {
    let filteredData = data;

    // Apply filters
    Object.entries(filters).forEach(([fieldName, filterValue]) => {
      if (filterValue.trim()) {
        filteredData = filteredData.filter(row => {
          const cellValue = row[fieldName];
          const stringValue = cellValue ? String(cellValue).toLowerCase() : '';
          return stringValue.includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortField) {
      filteredData = [...filteredData].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // String comparison
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return filteredData;
  }, [data, filters, sortField, sortDirection]);

  const handleSort = (fieldName: string) => {
    if (sortField === fieldName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(fieldName);
      setSortDirection('asc');
    }
  };

  const handleFilter = (fieldName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleRowSelection = (rowIndex: number, selected: boolean) => {
    const newSelected = new Set(selectedRows);
    if (selected) {
      newSelected.add(rowIndex);
    } else {
      newSelected.delete(rowIndex);
    }
    setSelectedRows(newSelected);
    onRowSelect?.(Array.from(newSelected));
  };

  const renderCellValue = (value: any, column: TableColumn) => {
    if (value == null) return '';

    switch (column.dataType) {
      case 'Boolean':
        return value ? '✓' : '✗';
      case 'Array':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'Json':
        return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      case 'Number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      default:
        return String(value);
    }
  };

  const getCellClassName = (column: TableColumn, value: any) => {
    const classes = ['table-cell'];
    
    if (column.required && (value == null || value === '')) {
      classes.push('cell-required-empty');
    }
    
    if (column.dataType === 'Number') {
      classes.push('cell-numeric');
    }
    
    if (column.dataType === 'Boolean') {
      classes.push('cell-boolean');
    }

    return classes.join(' ');
  };

  return (
    <div className="dynamic-table">
      <div className="table-controls">
        <div className="selection-info">
          {selectedRows.size > 0 && (
            <span>{selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected</span>
          )}
        </div>
        <div className="table-stats">
          Showing {sortedAndFilteredData.length} of {data.length} rows
        </div>
      </div>

      <div className="table-container">
        <table className="enhanced-table">
          <thead>
            <tr>
              <th className="select-column">
                <input
                  type="checkbox"
                  checked={selectedRows.size === sortedAndFilteredData.length && sortedAndFilteredData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const allRows = new Set(sortedAndFilteredData.map((_, index) => index));
                      setSelectedRows(allRows);
                      onRowSelect?.(Array.from(allRows));
                    } else {
                      setSelectedRows(new Set());
                      onRowSelect?.([]);
                    }
                  }}
                />
              </th>
              {columns.map((column) => (
                <th
                  key={column.fieldName}
                  style={{ width: column.width }}
                  className={`column-${column.fieldName} ${column.required ? 'required-column' : ''}`}
                >
                  <div className="column-header">
                    <div className="column-title">
                      {column.sortable ? (
                        <button
                          className="sort-button"
                          onClick={() => handleSort(column.fieldName)}
                        >
                          {column.displayName}
                          {sortField === column.fieldName && (
                            <span className="sort-indicator">
                              {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span>{column.displayName}</span>
                      )}
                      {column.required && <span className="required-indicator">*</span>}
                    </div>
                    {column.filterable && (
                      <input
                        type="text"
                        className="column-filter"
                        placeholder="Filter..."
                        value={filters[column.fieldName] || ''}
                        onChange={(e) => handleFilter(column.fieldName, e.target.value)}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={selectedRows.has(rowIndex) ? 'selected-row' : ''}
              >
                <td className="select-column">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={(e) => handleRowSelection(rowIndex, e.target.checked)}
                  />
                </td>
                {columns.map((column) => (
                  <td
                    key={column.fieldName}
                    className={getCellClassName(column, row[column.fieldName])}
                  >
                    {onCellEdit ? (
                      <input
                        type="text"
                        value={renderCellValue(row[column.fieldName], column)}
                        onChange={(e) => onCellEdit(rowIndex, column.fieldName, e.target.value)}
                        className="cell-editor"
                      />
                    ) : (
                      <span className="cell-value">
                        {renderCellValue(row[column.fieldName], column)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .dynamic-table {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .table-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background-color: #f5f5f5;
          border-bottom: 1px solid #ddd;
        }

        .table-container {
          flex: 1;
          overflow: auto;
        }

        .enhanced-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .enhanced-table th,
        .enhanced-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }

        .enhanced-table th {
          background-color: #f8f9fa;
          font-weight: bold;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .column-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .column-title {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sort-button {
          background: none;
          border: none;
          cursor: pointer;
          font-weight: bold;
          color: #007bff;
        }

        .sort-button:hover {
          text-decoration: underline;
        }

        .required-indicator {
          color: #dc3545;
          font-weight: bold;
        }

        .required-column {
          background-color: #fff3cd;
        }

        .column-filter {
          width: 100%;
          padding: 4px;
          border: 1px solid #ccc;
          border-radius: 3px;
          font-size: 12px;
        }

        .select-column {
          width: 30px;
          text-align: center;
        }

        .selected-row {
          background-color: #e3f2fd;
        }

        .cell-required-empty {
          background-color: #ffebee;
          border-color: #f44336;
        }

        .cell-numeric {
          text-align: right;
          font-family: monospace;
        }

        .cell-boolean {
          text-align: center;
          font-weight: bold;
        }

        .cell-editor {
          width: 100%;
          border: none;
          background: transparent;
          font-size: inherit;
        }

        .cell-editor:focus {
          outline: 2px solid #007bff;
          background-color: white;
        }

        .cell-value {
          display: block;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
};