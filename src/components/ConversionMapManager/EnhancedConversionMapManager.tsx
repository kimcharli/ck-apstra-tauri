import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import { useEnhancedConversion } from '../../hooks/useEnhancedConversion';
import { 
  EnhancedConversionMap, 
  FieldDefinition, 
  XlsxMapping, 
  DataType, 
  ApiMapping
} from '../../services/EnhancedConversionService';
import NavigationHeader from '../NavigationHeader/NavigationHeader';
import './ConversionMapManager.css';

interface EnhancedConversionMapManagerProps {
  onConversionMapChange?: (map: EnhancedConversionMap) => void;
  isVisible?: boolean;
  onClose?: () => void;
  onNavigate?: (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => void;
}

type TabType = 'overview' | 'fields' | 'transformations' | 'settings';

const EnhancedConversionMapManager: React.FC<EnhancedConversionMapManagerProps> = ({ 
  onConversionMapChange, 
  isVisible = false,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('fields');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [, setEditingField] = useState<FieldDefinition | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  const {
    state,
    loadMap,
    saveMap,
    addField,
    updateField,
    removeField,
    clearError
  } = useEnhancedConversion({
    autoLoad: false,
    onSuccess: (map) => {
      onConversionMapChange?.(map);
    }
  });

  useEffect(() => {
    if (isVisible && !state.enhancedMap && !state.loading) {
      loadMap().catch((error) => {
        console.error('Failed to load conversion map:', error);
      });
    }
    // CRITICAL: Do not include loadMap in dependency array - causes infinite re-renders
    // loadMap is recreated when state setters change, leading to infinite useEffect loops
  }, [isVisible, state.enhancedMap, state.loading]);

  const handleLoadFromFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      });

      if (!selected || Array.isArray(selected)) return;

      await loadMap(selected as string);
    } catch (error) {
      console.error('Failed to load conversion map from file:', error);
    }
  };

  const handleSaveToFile = async () => {
    if (!state.enhancedMap) return;
    
    try {
      const selected = await save({
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }],
        defaultPath: `enhanced_conversion_map_${new Date().toISOString().split('T')[0]}.json`
      });

      if (!selected) return;

      await saveMap(state.enhancedMap, selected);
    } catch (error) {
      console.error('Failed to save conversion map to file:', error);
    }
  };

  const handleAddField = async () => {
    if (!newFieldName.trim()) return;

    try {
      const defaultFieldDef = await invoke<FieldDefinition>('create_default_field_definition', {
        fieldName: newFieldName,
        displayName: newFieldName.charAt(0).toUpperCase() + newFieldName.slice(1).replace(/_/g, ' ')
      });

      await addField(newFieldName, defaultFieldDef);
      setNewFieldName('');
      setShowAddField(false);
      setSelectedField(newFieldName);
      setActiveTab('fields');
    } catch (error) {
      console.error('Failed to add field:', error);
    }
  };

  const handleUpdateField = async (fieldName: string, fieldDef: FieldDefinition) => {
    try {
      await updateField(fieldName, fieldDef);
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const handleRemoveField = async (fieldName: string) => {
    if (!confirm(`Are you sure you want to remove the field "${fieldName}"?`)) return;

    try {
      await removeField(fieldName);
      if (selectedField === fieldName) {
        setSelectedField(null);
      }
    } catch (error) {
      console.error('Failed to remove field:', error);
    }
  };

  const renderOverviewTab = () => {
    if (!state.enhancedMap) return null;

    return (
      <div className="overview-tab">
        <div className="overview-stats">
          <div className="stat-card">
            <h4>Field Definitions</h4>
            <div className="stat-value">{Object.keys(state.enhancedMap.field_definitions).length}</div>
          </div>
          <div className="stat-card">
            <h4>Transformation Rules</h4>
            <div className="stat-value">{Object.keys(state.enhancedMap.transformation_rules).length}</div>
          </div>
          <div className="stat-card">
            <h4>Header Row</h4>
            <div className="stat-value">{state.enhancedMap.header_row || 1}</div>
          </div>
          <div className="stat-card">
            <h4>Version</h4>
            <div className="stat-value">{state.enhancedMap.version}</div>
          </div>
        </div>

        <div className="overview-info">
          <h3>Conversion Map Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>Created:</strong> {state.enhancedMap.created_at ? new Date(state.enhancedMap.created_at).toLocaleString() : 'Unknown'}
            </div>
            <div className="info-item">
              <strong>Updated:</strong> {state.enhancedMap.updated_at ? new Date(state.enhancedMap.updated_at).toLocaleString() : 'Unknown'}
            </div>
            <div className="info-item">
              <strong>Required Fields:</strong> {
                Object.entries(state.enhancedMap.field_definitions)
                  .filter(([, def]) => def.is_required)
                  .length
              }
            </div>
            <div className="info-item">
              <strong>Key Fields:</strong> {
                Object.entries(state.enhancedMap.field_definitions)
                  .filter(([, def]) => def.is_key_field)
                  .length
              }
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button onClick={() => setActiveTab('fields')} className="action-button">
              Manage Fields
            </button>
            <button onClick={() => setActiveTab('transformations')} className="action-button">
              Configure Transformations
            </button>
            <button onClick={() => setActiveTab('settings')} className="action-button">
              Settings
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFieldsTab = () => {
    if (!state.enhancedMap) return null;

    return (
      <div className="fields-tab table-view">
        <div className="fields-header">
          <div className="fields-info">
            <h3>Field Definitions ({Object.keys(state.enhancedMap.field_definitions).length})</h3>
            <p>Click on any cell to edit field properties and mappings</p>
          </div>
          <div className="fields-actions">
            <button 
              onClick={() => setShowAddField(!showAddField)}
              className="add-field-button"
            >
              + Add Field
            </button>
          </div>
        </div>

        {showAddField && (
          <div className="add-field-form">
            <input
              type="text"
              placeholder="Field name (e.g., server_label)"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
            />
            <div className="form-actions">
              <button onClick={handleAddField} disabled={!newFieldName.trim()}>
                Add
              </button>
              <button onClick={() => { setShowAddField(false); setNewFieldName(''); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="fields-table-container">
          <table className="fields-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Display Name</th>
                <th>Description</th>
                <th>Type</th>
                <th>Required</th>
                <th>Key Field</th>
                <th>Excel Headers</th>
                <th>API Data Paths</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(state.enhancedMap.field_definitions).map(([fieldName, fieldDef]) => (
                <FieldTableRow
                  key={fieldName}
                  fieldName={fieldName}
                  fieldDefinition={fieldDef}
                  onUpdate={handleUpdateField}
                  onRemove={handleRemoveField}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTransformationsTab = () => {
    return (
      <div className="transformations-tab">
        <div className="coming-soon">
          <h3>Transformation Rules</h3>
          <p>Transformation rule management coming soon...</p>
          <p>Currently available transformations:</p>
          <ul>
            <li>generate_interface_name - Creates interface names based on speed and port</li>
            <li>normalize_speed - Normalizes speed values (25GB → 25G)</li>
            <li>trim_whitespace - Removes leading/trailing whitespace</li>
            <li>to_uppercase - Converts text to uppercase</li>
            <li>to_lowercase - Converts text to lowercase</li>
          </ul>
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    if (!state.enhancedMap) return null;

    return (
      <div className="settings-tab">
        <div className="settings-section">
          <h3>General Settings</h3>
          <div className="setting-item">
            <label>
              Header Row:
              <input 
                type="number" 
                value={state.enhancedMap.header_row || 1}
                onChange={(e) => {
                  const newRow = parseInt(e.target.value) || 1;
                  if (state.enhancedMap) {
                    const updatedMap = { ...state.enhancedMap, header_row: newRow };
                    onConversionMapChange?.(updatedMap);
                  }
                }}
                min="1"
                max="100"
              />
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Export & Import</h3>
          <div className="settings-actions">
            <button onClick={handleLoadFromFile} disabled={state.loading}>
              Load from File
            </button>
            <button onClick={handleSaveToFile} disabled={state.loading || !state.enhancedMap}>
              Save to File
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Advanced</h3>
          <div className="settings-info">
            <p>Version: {state.enhancedMap.version}</p>
            <p>Created: {state.enhancedMap.created_at ? new Date(state.enhancedMap.created_at).toLocaleString() : 'Unknown'}</p>
            <p>Last Updated: {state.lastUpdated ? state.lastUpdated.toLocaleString() : 'Unknown'}</p>
          </div>
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="conversion-map-page enhanced">
      <NavigationHeader
        currentPage="conversion-map"
        onNavigate={onNavigate || (() => {})}
        title="Enhanced Conversion Map Manager"
      />
      
      <div className="conversion-map-content">
        {state.error && (
          <div className="error-message">
            <p>Error: {state.error}</p>
            <button onClick={clearError} className="error-dismiss">×</button>
          </div>
        )}

        {state.loading && (
          <div className="loading-message">
            <p>Loading...</p>
          </div>
        )}

        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'fields' ? 'active' : ''}`}
            onClick={() => setActiveTab('fields')}
          >
            Fields
          </button>
          <button 
            className={`tab-button ${activeTab === 'transformations' ? 'active' : ''}`}
            onClick={() => setActiveTab('transformations')}
          >
            Transformations
          </button>
          <button 
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'fields' && renderFieldsTab()}
          {activeTab === 'transformations' && renderTransformationsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>
      </div>
    </div>
  );
};

// Field Table Row Component
interface FieldTableRowProps {
  fieldName: string;
  fieldDefinition: FieldDefinition;
  onUpdate: (fieldName: string, fieldDef: FieldDefinition) => void;
  onRemove: (fieldName: string) => void;
}

const FieldTableRow: React.FC<FieldTableRowProps> = ({ fieldName, fieldDefinition, onUpdate, onRemove }) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showXlsxMappings, setShowXlsxMappings] = useState(false);
  const [showApiMappings, setShowApiMappings] = useState(false);
  const [newXlsxMapping, setNewXlsxMapping] = useState('');
  const [newApiMapping, setNewApiMapping] = useState('');

  const handleCellEdit = (cellType: string, currentValue: any) => {
    setEditingCell(cellType);
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    let updatedField = { ...fieldDefinition };

    switch (editingCell) {
      case 'display_name':
        updatedField.display_name = editValue;
        break;
      case 'description':
        updatedField.description = editValue;
        break;
      case 'data_type':
        updatedField.data_type = editValue as DataType;
        break;
      case 'is_required':
        updatedField.is_required = editValue.toLowerCase() === 'true';
        break;
      case 'is_key_field':
        updatedField.is_key_field = editValue.toLowerCase() === 'true';
        break;
    }

    await onUpdate(fieldName, updatedField);
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const addXlsxMapping = async () => {
    if (!newXlsxMapping.trim()) return;

    const newMapping: XlsxMapping = {
      pattern: newXlsxMapping.trim(),
      mapping_type: 'Exact',
      priority: 100,
      case_sensitive: false
    };

    const updatedField = {
      ...fieldDefinition,
      xlsx_mappings: [...fieldDefinition.xlsx_mappings, newMapping]
    };

    await onUpdate(fieldName, updatedField);
    setNewXlsxMapping('');
  };

  const removeXlsxMapping = async (index: number) => {
    const updatedField = {
      ...fieldDefinition,
      xlsx_mappings: fieldDefinition.xlsx_mappings.filter((_, i) => i !== index)
    };
    await onUpdate(fieldName, updatedField);
  };

  const addApiMapping = async () => {
    if (!newApiMapping.trim()) return;

    const newMapping: ApiMapping = {
      primary_path: newApiMapping.trim(),
      fallback_paths: []
    };

    const updatedField = {
      ...fieldDefinition,
      api_mappings: [...fieldDefinition.api_mappings, newMapping]
    };

    await onUpdate(fieldName, updatedField);
    setNewApiMapping('');
  };

  const removeApiMapping = async (index: number) => {
    const updatedField = {
      ...fieldDefinition,
      api_mappings: fieldDefinition.api_mappings.filter((_, i) => i !== index)
    };
    await onUpdate(fieldName, updatedField);
  };

  const renderCell = (cellType: string, value: any, isBoolean = false) => {
    const isEditing = editingCell === cellType;

    if (isEditing) {
      return (
        <div className="editing-cell">
          {cellType === 'data_type' ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellSave();
                if (e.key === 'Escape') handleCellCancel();
              }}
              autoFocus
            >
              <option value="String">String</option>
              <option value="Number">Number</option>
              <option value="Boolean">Boolean</option>
              <option value="Array">Array</option>
              <option value="Json">JSON</option>
            </select>
          ) : isBoolean ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellSave();
                if (e.key === 'Escape') handleCellCancel();
              }}
              autoFocus
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellSave();
                if (e.key === 'Escape') handleCellCancel();
              }}
              autoFocus
            />
          )}
        </div>
      );
    }

    return (
      <div 
        className="editable-cell"
        onClick={() => handleCellEdit(cellType, value)}
        title="Click to edit"
      >
        {isBoolean ? (value ? 'Yes' : 'No') : (value || '-')}
      </div>
    );
  };

  const renderMappings = (mappings: any[], type: 'xlsx' | 'api') => {
    const isExpanded = type === 'xlsx' ? showXlsxMappings : showApiMappings;
    const setExpanded = type === 'xlsx' ? setShowXlsxMappings : setShowApiMappings;
    const newValue = type === 'xlsx' ? newXlsxMapping : newApiMapping;
    const setNewValue = type === 'xlsx' ? setNewXlsxMapping : setNewApiMapping;
    const addMapping = type === 'xlsx' ? addXlsxMapping : addApiMapping;
    const removeMapping = type === 'xlsx' ? removeXlsxMapping : removeApiMapping;

    return (
      <div className="mappings-container">
        <div 
          className="mappings-summary"
          onClick={() => setExpanded(!isExpanded)}
        >
          <span>{mappings.length} {type === 'xlsx' ? 'Excel' : 'API'} mapping{mappings.length !== 1 ? 's' : ''}</span>
          <span className="toggle-arrow">{isExpanded ? '▼' : '▶'}</span>
        </div>
        
        {isExpanded && (
          <div className="mappings-expanded">
            {mappings.map((mapping, index) => (
              <div key={index} className="mapping-row">
                <span className="mapping-text">
                  {type === 'xlsx' ? mapping.pattern : mapping.primary_path}
                </span>
                <button
                  onClick={() => removeMapping(index)}
                  className="remove-mapping-btn"
                  title="Remove mapping"
                >
                  ×
                </button>
              </div>
            ))}
            
            <div className="add-mapping-row">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={type === 'xlsx' ? 'Excel header name' : 'JSON path (e.g., $.data.field)'}
                onKeyDown={(e) => e.key === 'Enter' && addMapping()}
              />
              <button onClick={addMapping} disabled={!newValue.trim()}>
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <tr className="field-table-row">
      <td className="field-name-cell">
        <strong>{fieldName}</strong>
      </td>
      <td>{renderCell('display_name', fieldDefinition.display_name)}</td>
      <td>{renderCell('description', fieldDefinition.description)}</td>
      <td>{renderCell('data_type', fieldDefinition.data_type)}</td>
      <td>{renderCell('is_required', fieldDefinition.is_required, true)}</td>
      <td>{renderCell('is_key_field', fieldDefinition.is_key_field, true)}</td>
      <td className="mappings-cell">
        {renderMappings(fieldDefinition.xlsx_mappings, 'xlsx')}
      </td>
      <td className="mappings-cell">
        {renderMappings(fieldDefinition.api_mappings, 'api')}
      </td>
      <td className="actions-cell">
        <button 
          onClick={() => onRemove(fieldName)}
          className="remove-field-btn"
          title="Remove field"
        >
          Remove
        </button>
      </td>
    </tr>
  );
};

// Field Editor Component
interface FieldEditorProps {
  fieldName: string;
  fieldDefinition: FieldDefinition;
  onUpdate: (fieldName: string, fieldDef: FieldDefinition) => void;
  onRemove: (fieldName: string) => void;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({ fieldName, fieldDefinition, onUpdate, onRemove }) => {
  const [editedField, setEditedField] = useState<FieldDefinition>(fieldDefinition);
  const [newExcelHeader, setNewExcelHeader] = useState('');
  const [newApiPath, setNewApiPath] = useState('');

  const handleSave = () => {
    onUpdate(fieldName, editedField);
  };

  const addExcelMapping = () => {
    if (!newExcelHeader.trim()) return;

    const newMapping: XlsxMapping = {
      pattern: newExcelHeader.trim(),
      mapping_type: 'Exact',
      priority: 100,
      case_sensitive: false
    };

    setEditedField({
      ...editedField,
      xlsx_mappings: [...editedField.xlsx_mappings, newMapping]
    });
    setNewExcelHeader('');
  };

  const removeExcelMapping = (index: number) => {
    setEditedField({
      ...editedField,
      xlsx_mappings: editedField.xlsx_mappings.filter((_, i) => i !== index)
    });
  };

  const addApiMapping = () => {
    if (!newApiPath.trim()) return;

    const newMapping: ApiMapping = {
      primary_path: newApiPath.trim(),
      fallback_paths: []
    };

    setEditedField({
      ...editedField,
      api_mappings: [...editedField.api_mappings, newMapping]
    });
    setNewApiPath('');
  };

  const removeApiMapping = (index: number) => {
    setEditedField({
      ...editedField,
      api_mappings: editedField.api_mappings.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="field-editor">
      <div className="field-editor-header">
        <h3>{fieldName}</h3>
        <div className="field-actions">
          <button onClick={handleSave} className="save-button">Save Changes</button>
          <button onClick={() => onRemove(fieldName)} className="remove-button">Remove Field</button>
        </div>
      </div>

      <div className="field-editor-content">
        <div className="basic-properties">
          <h4>Basic Properties</h4>
          
          <div className="form-group">
            <label>Display Name:</label>
            <input
              type="text"
              value={editedField.display_name}
              onChange={(e) => setEditedField({ ...editedField, display_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={editedField.description}
              onChange={(e) => setEditedField({ ...editedField, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Data Type:</label>
            <select
              value={editedField.data_type}
              onChange={(e) => setEditedField({ ...editedField, data_type: e.target.value as DataType })}
            >
              <option value="String">String</option>
              <option value="Number">Number</option>
              <option value="Boolean">Boolean</option>
              <option value="Array">Array</option>
              <option value="Json">JSON</option>
            </select>
          </div>

          <div className="form-group checkboxes">
            <label>
              <input
                type="checkbox"
                checked={editedField.is_required}
                onChange={(e) => setEditedField({ ...editedField, is_required: e.target.checked })}
              />
              Required Field
            </label>
            <label>
              <input
                type="checkbox"
                checked={editedField.is_key_field}
                onChange={(e) => setEditedField({ ...editedField, is_key_field: e.target.checked })}
              />
              Key Field
            </label>
          </div>
        </div>

        <div className="excel-mappings">
          <h4>Excel Header Mappings</h4>
          
          <div className="add-mapping">
            <input
              type="text"
              placeholder="Excel header name"
              value={newExcelHeader}
              onChange={(e) => setNewExcelHeader(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addExcelMapping()}
            />
            <button onClick={addExcelMapping}>Add</button>
          </div>

          <div className="mappings-list">
            {editedField.xlsx_mappings.map((mapping, index) => (
              <div key={index} className="mapping-item">
                <span>{mapping.pattern}</span>
                <span className="mapping-type">{mapping.mapping_type}</span>
                <button onClick={() => removeExcelMapping(index)}>Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="api-mappings">
          <h4>API Data Paths</h4>
          
          <div className="add-mapping">
            <input
              type="text"
              placeholder="JSON path (e.g., $.data.field_name)"
              value={newApiPath}
              onChange={(e) => setNewApiPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addApiMapping()}
            />
            <button onClick={addApiMapping}>Add</button>
          </div>

          <div className="mappings-list">
            {editedField.api_mappings.map((mapping, index) => (
              <div key={index} className="mapping-item">
                <span>{mapping.primary_path}</span>
                <button onClick={() => removeApiMapping(index)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedConversionMapManager;