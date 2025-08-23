import React, { useState, useMemo } from 'react';
import { NetworkConfigRow, ApstraConfig } from '../../types';
import './ProvisioningTable.css';

interface ProvisioningTableProps {
  data: NetworkConfigRow[];
  isLoading: boolean;
  onProvision: (selectedRows: NetworkConfigRow[]) => void;
  apstraConfig?: ApstraConfig | null;
}

const ProvisioningTable: React.FC<ProvisioningTableProps> = ({
  data,
  isLoading,
  onProvision,
  apstraConfig
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<keyof NetworkConfigRow | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');

  // Enhanced column definitions with better headers and formatting
  const columns = [
    { key: 'switch_label', header: 'Switch Name', width: '150px', sortable: true },
    { key: 'switch_ifname', header: 'Switch Interface', width: '120px', sortable: true },
    { key: 'server_label', header: 'Server Name', width: '150px', sortable: true },
    { key: 'server_ifname', header: 'Server Interface', width: '120px', sortable: true },
    { key: 'link_speed', header: 'Link Speed', width: '100px', sortable: true },
    { key: 'is_external', header: 'External', width: '80px', sortable: true },
    { key: 'link_group_ifname', header: 'LAG/Bond Name', width: '120px', sortable: true },
    { key: 'link_group_lag_mode', header: 'LAG Mode', width: '100px', sortable: true },
    { key: 'link_group_ct_names', header: 'Connectivity Template', width: '150px', sortable: true },
    { key: 'server_tags', header: 'Server Tags', width: '120px', sortable: false },
    { key: 'link_tags', header: 'Link Tags', width: '120px', sortable: false },
    { key: 'comment', header: 'Comments', width: '200px', sortable: false }
  ];

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Apply text filter
    if (filterText) {
      const searchText = filterText.toLowerCase();
      filtered = data.filter(row => 
        Object.values(row).some(value => 
          value?.toString().toLowerCase().includes(searchText)
        )
      );
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, filterText, sortField, sortDirection]);

  const handleSort = (field: keyof NetworkConfigRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredAndSortedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAndSortedData.map((_, index) => index)));
    }
  };

  const handleProvision = () => {
    const rowsToProvision = filteredAndSortedData.filter((_, index) => selectedRows.has(index));
    onProvision(rowsToProvision);
  };

  const formatCellValue = (value: any, columnKey: string): string => {
    if (value === null || value === undefined) return '';
    
    switch (columnKey) {
      case 'is_external':
        return value === true ? 'Yes' : value === false ? 'No' : '';
      case 'link_speed':
        // Don't add Gbps if the value already has a unit (G, M, etc.)
        if (value && typeof value === 'string' && /[GM]$/.test(value)) {
          return value;
        }
        return value ? `${value} Gbps` : '';
      default:
        return value.toString();
    }
  };

  const getCellClass = (value: any, columnKey: string): string => {
    let baseClass = 'table-cell';
    
    if (columnKey === 'is_external') {
      baseClass += value === true ? ' external-yes' : value === false ? ' external-no' : '';
    }
    
    if (!value) {
      baseClass += ' empty-cell';
    }
    
    return baseClass;
  };

  if (isLoading) {
    return (
      <div className="provisioning-table-container">
        <div className="loading-message">Loading network configuration data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="provisioning-table-container">
        <div className="no-data-message">No data available. Please upload and parse an Excel file.</div>
      </div>
    );
  }

  return (
    <div className="provisioning-table-container">
      <div className="table-controls">
        <div className="table-info">
          <span className="data-count">
            Showing {filteredAndSortedData.length} of {data.length} rows
            {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
          </span>
          {apstraConfig && (
            <span className="target-info">
              Target: {apstraConfig.host} ({apstraConfig.blueprint_name})
            </span>
          )}
        </div>
        
        <div className="table-actions">
          <input
            type="text"
            placeholder="Filter data..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="filter-input"
          />
          <button
            onClick={handleProvision}
            disabled={selectedRows.size === 0 || !apstraConfig}
            className="provision-button"
          >
            Provision Selected ({selectedRows.size})
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="provisioning-table">
          <thead>
            <tr>
              <th className="select-column">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                  onChange={handleSelectAll}
                  title="Select all visible rows"
                />
              </th>
              {columns.map(column => (
                <th 
                  key={column.key} 
                  style={{ minWidth: column.width }}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={column.sortable ? () => handleSort(column.key as keyof NetworkConfigRow) : undefined}
                >
                  <div className="header-content">
                    {column.header}
                    {column.sortable && sortField === column.key && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.map((row, index) => (
              <tr 
                key={index}
                className={selectedRows.has(index) ? 'selected' : ''}
                onClick={() => handleRowSelect(index)}
              >
                <td className="select-column">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(index)}
                    onChange={() => handleRowSelect(index)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                {columns.map(column => (
                  <td 
                    key={column.key}
                    className={getCellClass(row[column.key as keyof NetworkConfigRow], column.key)}
                    title={formatCellValue(row[column.key as keyof NetworkConfigRow], column.key)}
                  >
                    {formatCellValue(row[column.key as keyof NetworkConfigRow], column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="provisioning-summary">
          <strong>Provisioning Summary:</strong>
          <ul>
            <li>Selected Rows: {selectedRows.size}</li>
            <li>Switches: {new Set(filteredAndSortedData.filter((_, i) => selectedRows.has(i)).map(r => r.switch_label).filter(Boolean)).size}</li>
            <li>Servers: {new Set(filteredAndSortedData.filter((_, i) => selectedRows.has(i)).map(r => r.server_label).filter(Boolean)).size}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProvisioningTable;