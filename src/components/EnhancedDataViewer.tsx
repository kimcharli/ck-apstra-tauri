import React, { useState, useEffect } from 'react';
import { DynamicTable } from './DynamicTable';
import { DynamicForm } from './DynamicForm';
import { 
  EnhancedConversionService, 
  EnhancedConversionMap, 
  HeaderConversionResult,
  ValidationResult,
  ValidationError
} from '../services/EnhancedConversionService';

interface EnhancedDataViewerProps {
  excelHeaders: string[];
  excelData: Array<Record<string, any>>;
  conversionMapPath?: string;
  onDataReady?: (processedData: Array<Record<string, any>>) => void;
  onValidationChange?: (result: ValidationResult) => void;
}

type ViewMode = 'table' | 'form' | 'split';

export const EnhancedDataViewer: React.FC<EnhancedDataViewerProps> = ({
  excelHeaders,
  excelData,
  conversionMapPath,
  onDataReady,
  onValidationChange
}) => {
  const [enhancedMap, setEnhancedMap] = useState<EnhancedConversionMap | null>(null);
  const [conversionResult, setConversionResult] = useState<HeaderConversionResult | null>(null);
  const [processedData, setProcessedData] = useState<Array<Record<string, any>>>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<Record<string, any>>({});

  // Load enhanced conversion map
  useEffect(() => {
    const loadEnhancedMap = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const map = await EnhancedConversionService.loadEnhancedConversionMap(conversionMapPath);
        setEnhancedMap(map);
        
        // Convert headers using enhanced map
        const result = await EnhancedConversionService.convertHeadersEnhanced(excelHeaders, map);
        setConversionResult(result);
        
      } catch (err) {
        console.error('Failed to load enhanced conversion map:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedMap();
  }, [excelHeaders, conversionMapPath]);

  // Process data when conversion result is available
  useEffect(() => {
    if (!conversionResult || !enhancedMap || !excelData.length) {
      return;
    }

    const processData = async () => {
      try {
        const processed = excelData.map(row => {
          const convertedRow: Record<string, any> = {};
          
          // Apply header mappings
          Object.entries(conversionResult.converted_headers).forEach(([excelHeader, internalField]) => {
            if (row[excelHeader] !== undefined) {
              convertedRow[internalField] = row[excelHeader];
            }
          });
          
          return convertedRow;
        });

        // Apply field transformations for each row
        const transformedData = [];
        for (const row of processed) {
          try {
            const transformed = await EnhancedConversionService.applyFieldTransformations(row, enhancedMap);
            transformedData.push(transformed);
          } catch (err) {
            console.warn('Failed to transform row, using original:', err);
            transformedData.push(row);
          }
        }

        setProcessedData(transformedData);
        onDataReady?.(transformedData);

        // Validate all processed data
        const allValidationResults: ValidationError[] = [];
        for (let i = 0; i < transformedData.length; i++) {
          try {
            const rowValidation = await EnhancedConversionService.validateFieldValues(transformedData[i], enhancedMap);
            
            // Add row context to errors
            const rowErrors = rowValidation.errors.map(error => ({
              ...error,
              field: `Row ${i + 1}: ${error.field}`
            }));
            allValidationResults.push(...rowErrors);
            
          } catch (err) {
            console.warn(`Failed to validate row ${i + 1}:`, err);
          }
        }

        const combinedValidation: ValidationResult = {
          is_valid: allValidationResults.length === 0,
          errors: allValidationResults.filter(e => e.severity === 'Error'),
          warnings: allValidationResults.filter(e => e.severity === 'Warning'),
          field_summary: {}
        };

        setValidationResult(combinedValidation);
        onValidationChange?.(combinedValidation);

      } catch (err) {
        console.error('Failed to process data:', err);
        setError(err instanceof Error ? err.message : 'Data processing failed');
      }
    };

    processData();
  }, [conversionResult, enhancedMap, excelData, onDataReady, onValidationChange]);

  const handleCellEdit = async (rowIndex: number, fieldName: string, value: any) => {
    if (!enhancedMap) return;

    const updatedData = [...processedData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [fieldName]: value };

    // Apply transformations to the updated row
    try {
      const transformed = await EnhancedConversionService.applyFieldTransformations(updatedData[rowIndex], enhancedMap);
      updatedData[rowIndex] = transformed;
    } catch (err) {
      console.warn('Failed to apply transformations:', err);
    }

    setProcessedData(updatedData);
    onDataReady?.(updatedData);

    // Re-validate the updated row
    try {
      const rowValidation = await EnhancedConversionService.validateFieldValues(updatedData[rowIndex], enhancedMap);
      
      // Update validation result (simplified - in production you'd want to merge with existing results)
      const hasErrors = rowValidation.errors.length > 0;
      const updatedValidation: ValidationResult = {
        is_valid: !hasErrors,
        errors: rowValidation.errors,
        warnings: rowValidation.warnings,
        field_summary: rowValidation.field_summary
      };
      
      setValidationResult(updatedValidation);
      onValidationChange?.(updatedValidation);
    } catch (err) {
      console.warn('Failed to validate updated row:', err);
    }
  };

  const handleRowSelect = (selectedRows: number[]) => {
    if (selectedRows.length === 1) {
      setSelectedRowIndex(selectedRows[0]);
      setEditingData(processedData[selectedRows[0]] || {});
    } else {
      setSelectedRowIndex(null);
      setEditingData({});
    }
  };

  const handleFormSubmit = (formData: Record<string, any>) => {
    if (selectedRowIndex === null) return;

    const updatedData = [...processedData];
    updatedData[selectedRowIndex] = formData;
    setProcessedData(updatedData);
    setEditingData(formData);
    onDataReady?.(updatedData);
  };

  const renderConversionSummary = () => {
    if (!conversionResult) return null;

    const mappedCount = Object.keys(conversionResult.converted_headers).length;
    const totalHeaders = excelHeaders.length;
    const unmappedHeaders = excelHeaders.filter(header => 
      !Object.keys(conversionResult.converted_headers).includes(header)
    );

    return (
      <div className="conversion-summary">
        <h3>Header Conversion Summary</h3>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-label">Mapped Headers:</span>
            <span className="stat-value">{mappedCount} / {totalHeaders}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Conversion Confidence:</span>
            <span className="stat-value">
              {Object.values(conversionResult.mapping_confidence).length > 0
                ? `${Math.round(Object.values(conversionResult.mapping_confidence).reduce((a, b) => a + b, 0) / Object.values(conversionResult.mapping_confidence).length * 100)}%`
                : 'N/A'}
            </span>
          </div>
        </div>
        
        {unmappedHeaders.length > 0 && (
          <div className="unmapped-headers">
            <h4>Unmapped Headers:</h4>
            <ul>
              {unmappedHeaders.map((header, index) => (
                <li key={index} className="unmapped-header">{header}</li>
              ))}
            </ul>
          </div>
        )}
        
        {conversionResult.validation_errors.length > 0 && (
          <div className="conversion-errors">
            <h4>Conversion Issues:</h4>
            <ul>
              {conversionResult.validation_errors.map((error, index) => (
                <li key={index} className="conversion-error">
                  <strong>{error.field}:</strong> {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderValidationSummary = () => {
    if (!validationResult) return null;

    return (
      <div className="validation-summary">
        <h3>Data Validation Summary</h3>
        <div className="validation-status">
          <span className={`status-indicator ${validationResult.is_valid ? 'valid' : 'invalid'}`}>
            {validationResult.is_valid ? '✓ Valid' : '✗ Issues Found'}
          </span>
        </div>
        
        {validationResult.errors.length > 0 && (
          <div className="validation-errors">
            <h4>Errors ({validationResult.errors.length}):</h4>
            <ul>
              {validationResult.errors.slice(0, 10).map((error, index) => (
                <li key={index} className="validation-error">
                  <strong>{error.field}:</strong> {error.message}
                </li>
              ))}
              {validationResult.errors.length > 10 && (
                <li className="more-errors">
                  ... and {validationResult.errors.length - 10} more errors
                </li>
              )}
            </ul>
          </div>
        )}
        
        {validationResult.warnings.length > 0 && (
          <div className="validation-warnings">
            <h4>Warnings ({validationResult.warnings.length}):</h4>
            <ul>
              {validationResult.warnings.slice(0, 5).map((warning, index) => (
                <li key={index} className="validation-warning">
                  <strong>{warning.field}:</strong> {warning.message}
                </li>
              ))}
              {validationResult.warnings.length > 5 && (
                <li className="more-warnings">
                  ... and {validationResult.warnings.length - 5} more warnings
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading enhanced conversion map...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!enhancedMap) {
    return <div className="error">No enhanced conversion map available</div>;
  }

  return (
    <div className="enhanced-data-viewer">
      <div className="viewer-header">
        <h2>Enhanced Data Viewer</h2>
        <div className="view-controls">
          <button 
            className={`view-button ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            Table View
          </button>
          <button 
            className={`view-button ${viewMode === 'form' ? 'active' : ''}`}
            onClick={() => setViewMode('form')}
            disabled={selectedRowIndex === null}
          >
            Form View
          </button>
          <button 
            className={`view-button ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
          >
            Split View
          </button>
        </div>
      </div>

      <div className="summary-section">
        {renderConversionSummary()}
        {renderValidationSummary()}
      </div>

      <div className={`viewer-content ${viewMode}`}>
        {(viewMode === 'table' || viewMode === 'split') && (
          <div className="table-section">
            <DynamicTable
              data={processedData}
              enhancedMap={enhancedMap}
              context="viewer"
              onCellEdit={handleCellEdit}
              onRowSelect={handleRowSelect}
            />
          </div>
        )}
        
        {(viewMode === 'form' || viewMode === 'split') && selectedRowIndex !== null && (
          <div className="form-section">
            <h3>Edit Row {selectedRowIndex + 1}</h3>
            <DynamicForm
              enhancedMap={enhancedMap}
              initialData={editingData}
              context="editor"
              onSubmit={handleFormSubmit}
              onChange={(field, value) => {
                setEditingData(prev => ({ ...prev, [field]: value }));
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        .enhanced-data-viewer {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .view-controls {
          display: flex;
          gap: 8px;
        }

        .view-button {
          padding: 8px 16px;
          border: 1px solid #dee2e6;
          background-color: white;
          color: #495057;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .view-button:hover:not(:disabled) {
          background-color: #e9ecef;
        }

        .view-button.active {
          background-color: #007bff;
          color: white;
          border-color: #007bff;
        }

        .view-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .summary-section {
          padding: 16px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .conversion-summary,
        .validation-summary {
          flex: 1;
          min-width: 300px;
        }

        .summary-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #6c757d;
          font-weight: bold;
        }

        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #495057;
        }

        .status-indicator {
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
        }

        .status-indicator.valid {
          background-color: #d4edda;
          color: #155724;
        }

        .status-indicator.invalid {
          background-color: #f8d7da;
          color: #721c24;
        }

        .unmapped-headers,
        .conversion-errors,
        .validation-errors,
        .validation-warnings {
          margin-top: 12px;
        }

        .unmapped-headers ul,
        .conversion-errors ul,
        .validation-errors ul,
        .validation-warnings ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }

        .unmapped-header {
          color: #6c757d;
          font-family: monospace;
        }

        .conversion-error,
        .validation-error {
          color: #dc3545;
          margin-bottom: 4px;
        }

        .validation-warning {
          color: #fd7e14;
          margin-bottom: 4px;
        }

        .more-errors,
        .more-warnings {
          font-style: italic;
          color: #6c757d;
        }

        .viewer-content {
          flex: 1;
          overflow: hidden;
          display: flex;
        }

        .viewer-content.table {
          flex-direction: column;
        }

        .viewer-content.form {
          flex-direction: column;
          padding: 16px;
        }

        .viewer-content.split {
          flex-direction: row;
        }

        .table-section {
          flex: 1;
          overflow: hidden;
        }

        .form-section {
          flex: 1;
          padding: 16px;
          border-left: 1px solid #dee2e6;
          overflow-y: auto;
        }

        .split .table-section {
          flex: 2;
        }

        .split .form-section {
          flex: 1;
          min-width: 400px;
        }

        .loading,
        .error {
          padding: 40px;
          text-align: center;
          font-size: 18px;
        }

        .error {
          color: #dc3545;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};