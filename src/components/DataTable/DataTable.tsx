import React from 'react';
import './DataTable.module.css';

const DataTable: React.FC = () => {
  return (
    <div className="data-table">
      <h2>Network Configuration Data</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Blueprint</th>
              <th>Server Label</th>
              <th>Switch Label</th>
              <th>Switch Interface</th>
              <th>Link Speed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6}>No data available. Upload and process a file to view data.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;