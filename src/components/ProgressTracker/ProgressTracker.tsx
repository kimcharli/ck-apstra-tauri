import React from 'react';
import './ProgressTracker.module.css';

const ProgressTracker: React.FC = () => {
  return (
    <div className="progress-tracker">
      <h2>Processing Progress</h2>
      <div className="progress-content">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '0%' }}></div>
        </div>
        <div className="progress-info">
          <p>No active processing</p>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;