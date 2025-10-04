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
import NavigationHeader from '../../../shared/components/NavigationHeader/NavigationHeader';
import './ConversionMapManager.css';

interface EnhancedConversionTableEditorProps {
  onConversionMapChange?: (map: EnhancedConversionMap) => void;
  isVisible?: boolean;
  onClose?: () => void;
  onNavigate?: (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => void;
}

interface EditingCell {
  fieldName: string;
  property: 'display_name' | 'description' | 'data_type' | 'is_required' | 'is_key_field';
}

// interface EditingMapping {
//   fieldName: string;
//   mappingIndex: number;
//   type: 'excel' | 'api';
// }

const EnhancedConversionTableEditor: React.FC<EnhancedConversionTableEditorProps> = ({ 
  onConversionMapChange, 
  isVisible = false,
  onNavigate
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  // const [, setEditingMapping] = useState<EditingMapping | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [expandedMappings, setExpandedMappings] = useState<Record<string, boolean>>({});

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
  }, [isVisible, state.enhancedMap, state.loading]);

  const handleCellEdit = (fieldName: string, property: EditingCell['property'], currentValue: any) => {
    setEditingCell({ fieldName, property });
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = async () => {
    if (!editingCell || !state.enhancedMap) return;

    const fieldDef = state.enhancedMap.field_definitions[editingCell.fieldName];
    if (!fieldDef) return;

    let updatedField = { ...fieldDef };

    switch (editingCell.property) {
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

    try {
      await updateField(editingCell.fieldName, updatedField);
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
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
    } catch (error) {
      console.error('Failed to add field:', error);
    }
  };

  const handleRemoveField = async (fieldName: string) => {
    if (!confirm(`Are you sure you want to remove the field "${fieldName}"?`)) return;

    try {
      await removeField(fieldName);
    } catch (error) {
      console.error('Failed to remove field:', error);
    }
  };

  const toggleMappings = (fieldName: string) => {
    setExpandedMappings(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const addExcelMapping = async (fieldName: string, pattern: string) => {
    if (!state.enhancedMap || !pattern.trim()) return;

    const fieldDef = state.enhancedMap.field_definitions[fieldName];
    if (!fieldDef) return;

    const newMapping: XlsxMapping = {
      pattern: pattern.trim(),
      mapping_type: 'Exact',
      priority: 100,
      case_sensitive: false
    };

    const updatedField = {
      ...fieldDef,
      xlsx_mappings: [...fieldDef.xlsx_mappings, newMapping]
    };

    try {
      await updateField(fieldName, updatedField);
    } catch (error) {
      console.error('Failed to add Excel mapping:', error);
    }
  };

  const removeExcelMapping = async (fieldName: string, index: number) => {
    if (!state.enhancedMap) return;

    const fieldDef = state.enhancedMap.field_definitions[fieldName];
    if (!fieldDef) return;

    const updatedField = {
      ...fieldDef,
      xlsx_mappings: fieldDef.xlsx_mappings.filter((_, i) => i !== index)
    };

    try {
      await updateField(fieldName, updatedField);
    } catch (error) {
      console.error('Failed to remove Excel mapping:', error);
    }
  };

  const addApiMapping = async (fieldName: string, path: string) => {
    if (!state.enhancedMap || !path.trim()) return;

    const fieldDef = state.enhancedMap.field_definitions[fieldName];
    if (!fieldDef) return;

    const newMapping: ApiMapping = {
      primary_path: path.trim(),
      fallback_paths: []
    };

    const updatedField = {
      ...fieldDef,
      api_mappings: [...fieldDef.api_mappings, newMapping]
    };

    try {
      await updateField(fieldName, updatedField);
    } catch (error) {
      console.error('Failed to add API mapping:', error);
    }
  };

  const removeApiMapping = async (fieldName: string, index: number) => {
    if (!state.enhancedMap) return;

    const fieldDef = state.enhancedMap.field_definitions[fieldName];
    if (!fieldDef) return;

    const updatedField = {
      ...fieldDef,
      api_mappings: fieldDef.api_mappings.filter((_, i) => i !== index)
    };

    try {
      await updateField(fieldName, updatedField);
    } catch (error) {
      console.error('Failed to remove API mapping:', error);
    }
  };

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

  const renderCell = (fieldName: string, property: EditingCell['property'], value: any) => {
    const isEditing = editingCell?.fieldName === fieldName && editingCell?.property === property;

    if (isEditing) {
      return (
        <div className="editing-cell">
          {property === 'data_type' ? (
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
          ) : property === 'is_required' || property === 'is_key_field' ? (
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
        onClick={() => handleCellEdit(fieldName, property, value)}
        title="Click to edit"
      >
        {property === 'is_required' || property === 'is_key_field' ? 
          (value ? 'Yes' : 'No') : 
          (value || '-')
        }
      </div>
    );
  };

  const renderMappingsCell = (fieldName: string, fieldDef: FieldDefinition) => {
    const isExpanded = expandedMappings[fieldName];
    const excelCount = fieldDef.xlsx_mappings.length;
    const apiCount = fieldDef.api_mappings.length;

    return (
      <div className="mappings-cell">
        <div className="mappings-summary" onClick={() => toggleMappings(fieldName)}>
          <span className="mapping-counts">
            Excel: {excelCount}, API: {apiCount}
          </span>
          <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
        
        {isExpanded && (
          <div className="mappings-expanded">
            <div className="excel-mappings-section">
              <h5>Excel Headers</h5>
              {fieldDef.xlsx_mappings.map((mapping, index) => (
                <div key={index} className="mapping-item">
                  <span className="mapping-pattern">{mapping.pattern}</span>
                  <span className="mapping-type">({mapping.mapping_type})</span>
                  <button 
                    className="remove-mapping-btn"
                    onClick={() => removeExcelMapping(fieldName, index)}
                    title="Remove mapping"
                  >
                    ×
                  </button>
                </div>
              ))}
              <AddMappingInput
                placeholder="Add Excel header"
                onAdd={(value) => addExcelMapping(fieldName, value)}
              />
            </div>

            <div className="api-mappings-section">
              <h5>API Paths</h5>
              {fieldDef.api_mappings.map((mapping, index) => (
                <div key={index} className="mapping-item">
                  <span className="mapping-pattern">{mapping.primary_path}</span>
                  <button 
                    className="remove-mapping-btn"
                    onClick={() => removeApiMapping(fieldName, index)}
                    title="Remove mapping"
                  >
                    ×
                  </button>
                </div>
              ))}
              <AddMappingInput
                placeholder="Add API path (e.g., $.data.field)"
                onAdd={(value) => addApiMapping(fieldName, value)}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="conversion-map-page enhanced table-editor">
      <NavigationHeader
        currentPage="conversion-map"
        onNavigate={onNavigate || (() => {})}
        title="Enhanced Conversion Map - Table Editor"
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
            <p>Loading conversion map...</p>
          </div>
        )}

        <div className="table-header-controls">
          <div className="map-info">
            {state.enhancedMap && (
              <>
                <span>Version: {state.enhancedMap.version}</span>
                <span>Fields: {Object.keys(state.enhancedMap.field_definitions).length}</span>
                <span>Header Row: {state.enhancedMap.header_row || 1}</span>
              </>
            )}
          </div>
          
          <div className="header-actions">
            <button onClick={handleLoadFromFile} disabled={state.loading}>
              Load from File
            </button>
            <button onClick={handleSaveToFile} disabled={state.loading || !state.enhancedMap}>
              Save to File
            </button>
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
            <button onClick={handleAddField} disabled={!newFieldName.trim()}>
              Add
            </button>
            <button onClick={() => { setShowAddField(false); setNewFieldName(''); }}>
              Cancel
            </button>
          </div>
        )}

        {state.enhancedMap && (
          <div className="conversion-table-container">
            <table className="conversion-map-table">
              <thead>
                <tr>
                  <th>Field Name</th>
                  <th>Display Name</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Key Field</th>
                  <th>Mappings</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(state.enhancedMap.field_definitions).map(([fieldName, fieldDef]) => (
                  <tr key={fieldName} className="field-row">
                    <td className="field-name-cell">
                      <strong>{fieldName}</strong>
                    </td>
                    <td>
                      {renderCell(fieldName, 'display_name', fieldDef.display_name)}
                    </td>
                    <td>
                      {renderCell(fieldName, 'description', fieldDef.description)}
                    </td>
                    <td>
                      {renderCell(fieldName, 'data_type', fieldDef.data_type)}
                    </td>
                    <td>
                      {renderCell(fieldName, 'is_required', fieldDef.is_required)}
                    </td>
                    <td>
                      {renderCell(fieldName, 'is_key_field', fieldDef.is_key_field)}
                    </td>
                    <td className="mappings-column">
                      {renderMappingsCell(fieldName, fieldDef)}
                    </td>
                    <td className="actions-column">
                      <button 
                        onClick={() => handleRemoveField(fieldName)}
                        className="remove-field-btn"
                        title="Remove field"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!state.enhancedMap && !state.loading && (
          <div className="no-data-message">
            <p>No conversion map loaded. Click "Load from File" to import a conversion map.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for adding new mappings
interface AddMappingInputProps {
  placeholder: string;
  onAdd: (value: string) => void;
}

const AddMappingInput: React.FC<AddMappingInputProps> = ({ placeholder, onAdd }) => {
  const [value, setValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setValue('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button 
        className="add-mapping-btn"
        onClick={() => setIsAdding(true)}
      >
        + Add
      </button>
    );
  }

  return (
    <div className="add-mapping-input">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') handleCancel();
        }}
        autoFocus
      />
      <button onClick={handleAdd}>Add</button>
      <button onClick={handleCancel}>Cancel</button>
    </div>
  );
};

export default EnhancedConversionTableEditor;