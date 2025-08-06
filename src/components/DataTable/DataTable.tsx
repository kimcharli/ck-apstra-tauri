import React from 'react';
import { NetworkConfigRow } from '../../types';
import './DataTable.module.css';

interface DataTableProps {
  data?: NetworkConfigRow[];
  isLoading?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({ data, isLoading }) => {
  const safeData = data ?? [];

  const renderCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  return (
    <div className="data-table">
      <h2>Network Configuration Data</h2>
      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading data...</p>
        </div>
      ) : safeData.length === 0 ? (
        <div className="table-container">
          <p>No data available. Upload a file and select a sheet to view data.</p>
        </div>
      ) : (
        <div className="table-container">
          <div style={{ marginBottom: '1rem' }}>
            <strong>Rows: {safeData.length}</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Blueprint</th>
                <th>Server Label</th>
                <th>Switch Label</th>
                <th>Switch Interface</th>
                <th>Server Interface</th>
                <th>Link Speed</th>
                <th>LAG Mode</th>
                <th>CT Names</th>
                <th>External</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {safeData.map((row, index) => (
                <tr key={index}>
                  <td>{renderCellValue(row.blueprint)}</td>
                  <td>{renderCellValue(row.server_label)}</td>
                  <td>{renderCellValue(row.switch_label)}</td>
                  <td>{renderCellValue(row.switch_ifname)}</td>
                  <td>{renderCellValue(row.server_ifname)}</td>
                  <td>{renderCellValue(row.link_speed)}</td>
                  <td>{renderCellValue(row.link_group_lag_mode)}</td>
                  <td>{renderCellValue(row.link_group_ct_names)}</td>
                  <td>{renderCellValue(row.is_external)}</td>
                  <td>{renderCellValue(row.comment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataTable;