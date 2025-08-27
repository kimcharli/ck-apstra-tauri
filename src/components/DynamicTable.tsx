import React, { useMemo, useState } from 'react';
import { EnhancedConversionMap } from '../services/EnhancedConversionService';
import { useTable } from '../hooks/useTable';
import { Table } from './common/Table/Table';
import styles from './DynamicTable.module.css';

interface DynamicTableProps {
  data: Array<Record<string, any>>;
  enhancedMap: EnhancedConversionMap;
  context?: string;
  onCellEdit?: (rowIndex: number, fieldName: string, value: any) => void;
  onRowSelect?: (selectedRows: number[]) => void;
}

interface TableColumn {
  key: string;
  header: string;
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
  onRowSelect,
}) => {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const columns = useMemo(() => {
    const tableColumns: TableColumn[] = [];

    for (const [fieldName, fieldDef] of Object.entries(
      enhancedMap.field_definitions
    )) {
      if (fieldDef.ui_config?.hidden && context !== 'debug') {
        continue;
      }

      const column: TableColumn = {
        key: fieldName,
        header: fieldDef.display_name,
        dataType: fieldDef.data_type,
        width: fieldDef.ui_config?.column_width || 150,
        sortable: fieldDef.ui_config?.sortable !== false,
        filterable: fieldDef.ui_config?.filterable !== false,
        hidden: fieldDef.ui_config?.hidden || false,
        required: fieldDef.is_required,
      };

      tableColumns.push(column);
    }

    return tableColumns.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.header.localeCompare(b.header);
    });
  }, [enhancedMap, context]);

  const filteredData = useMemo(() => {
    let filtered = data;
    Object.entries(filters).forEach(([fieldName, filterValue]) => {
      if (filterValue.trim()) {
        filtered = filtered.filter((row) => {
          const cellValue = row[fieldName];
          const stringValue = cellValue ? String(cellValue).toLowerCase() : '';
          return stringValue.includes(filterValue.toLowerCase());
        });
      }
    });
    return filtered;
  }, [data, filters]);

  const { sortedData, sortKey, sortOrder, handleSort } = useTable({
    initialData: filteredData,
  });

  const handleFilter = (fieldName: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [fieldName]: value,
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
        return typeof value === 'object'
          ? JSON.stringify(value, null, 2)
          : String(value);
      case 'Number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      default:
        return String(value);
    }
  };

  const getCellClassName = (column: TableColumn, value: any) => {
    const classes = [styles.tableCell];

    if (column.required && (value == null || value === '')) {
      classes.push(styles.cellRequiredEmpty);
    }

    if (column.dataType === 'Number') {
      classes.push(styles.cellNumeric);
    }

    if (column.dataType === 'Boolean') {
      classes.push(styles.cellBoolean);
    }

    return classes.join(' ');
  };

  const tableColumns = useMemo(() => {
    return [
      {
        key: 'select',
        header: (
          <input
            type="checkbox"
            checked={
              selectedRows.size === sortedData.length && sortedData.length > 0
            }
            onChange={(e) => {
              if (e.target.checked) {
                const allRows = new Set(sortedData.map((_, index) => index));
                setSelectedRows(allRows);
                onRowSelect?.(Array.from(allRows));
              } else {
                setSelectedRows(new Set());
                onRowSelect?.([]);
              }
            }}
          />
        ),
        render: (row: any, index: number) => (
          <input
            type="checkbox"
            checked={selectedRows.has(index)}
            onChange={(e) => handleRowSelection(index, e.target.checked)}
          />
        ),
      },
      ...columns.map((column) => ({
        key: column.key,
        header: (
          <div className={styles.columnHeader}>
            <div className={styles.columnTitle}>
              {column.sortable ? (
                <button
                  className={styles.sortButton}
                  onClick={() => handleSort(column.key)}
                >
                  {column.header}
                  {sortKey === column.key && (
                    <span className="sort-indicator">
                      {sortOrder === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </button>
              ) : (
                <span>{column.header}</span>
              )}
              {column.required && (
                <span className={styles.requiredIndicator}>*</span>
              )}
            </div>
            {column.filterable && (
              <input
                type="text"
                className={styles.columnFilter}
                placeholder="Filter..."
                value={filters[column.key] || ''}
                onChange={(e) => handleFilter(column.key, e.target.value)}
              />
            )}
          </div>
        ),
        render: (row: any) =>
          onCellEdit ? (
            <input
              type="text"
              value={renderCellValue(row[column.key], column)}
              onChange={(e) =>
                onCellEdit(
                  data.indexOf(row),
                  column.key,
                  e.target.value
                )
              }
              className={styles.cellEditor}
            />
          ) : (
            <span className={styles.cellValue}>
              {renderCellValue(row[column.key], column)}
            </span>
          ),
      })),
    ];
  }, [columns, filters, selectedRows, sortedData, sortKey, sortOrder]);

  return (
    <div className={styles.dynamicTable}>
      <div className={styles.tableControls}>
        <div className="selection-info">
          {selectedRows.size > 0 && (
            <span>
              {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        <div className="table-stats">
          Showing {sortedData.length} of {data.length} rows
        </div>
      </div>
      <Table
        data={sortedData}
        columns={tableColumns}
        onSort={handleSort}
        sortKey={sortKey}
        sortOrder={sortOrder}
      />
    </div>
  );
};
