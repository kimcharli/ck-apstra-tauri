import React from 'react';
import './ActionPanel.module.css';

const ActionPanel: React.FC = () => {
  return (
    <div className="action-panel">
      <h2>Actions</h2>
      <div className="action-controls">
        <select disabled>
          <option value="">Select an action...</option>
          <option value="import-generic-system">Import Generic System</option>
        </select>
        <button disabled>Start Processing</button>
      </div>
    </div>
  );
};

export default ActionPanel;