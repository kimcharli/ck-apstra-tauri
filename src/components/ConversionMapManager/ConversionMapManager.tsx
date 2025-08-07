import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import { ConversionMap, HeaderMapping } from '../../types';
import NavigationHeader from '../NavigationHeader/NavigationHeader';
import './ConversionMapManager.css';

interface ConversionMapManagerProps {
  onConversionMapChange?: (map: ConversionMap) => void;
  isVisible?: boolean;
  onClose?: () => void;
  onNavigate?: (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => void;
}

const ConversionMapManager: React.FC<ConversionMapManagerProps> = ({ 
  onConversionMapChange, 
  isVisible = false,
  onNavigate
}) => {
  const [conversionMap, setConversionMap] = useState<ConversionMap | null>(null);
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [mappings, setMappings] = useState<HeaderMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newExcelHeader, setNewExcelHeader] = useState('');
  const [newTargetField, setNewTargetField] = useState('');

  const availableFields = [
    'Switch', 'Switch Tags', 'Switch Interface', 'Link Tags', 
    'CTs', 'AE', 'LAG Mode', 'Speed', 'Server Interface', 
    'Server', 'External', 'Server Tags'
  ];

  useEffect(() => {
    if (isVisible) {
      loadUserConversionMap();
    }
  }, [isVisible]);

  const loadUserConversionMap = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const map = await invoke<ConversionMap>('load_user_conversion_map');
      setConversionMap(map);
      setHeaderRow(map.header_row || 1);
      
      // Convert mappings to UI format
      const uiMappings: HeaderMapping[] = Object.entries(map.mappings || {}).map(([excel, target]) => ({
        excelHeader: excel,
        targetField: target,
        isActive: true
      }));
      setMappings(uiMappings);
      
    } catch (error) {
      console.error('Failed to load conversion map:', error);
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDefaultConversionMap = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const map = await invoke<ConversionMap>('load_default_conversion_map');
      setConversionMap(map);
      setHeaderRow(map.header_row || 1);
      
      const uiMappings: HeaderMapping[] = Object.entries(map.mappings || {}).map(([excel, target]) => ({
        excelHeader: excel,
        targetField: target,
        isActive: true
      }));
      setMappings(uiMappings);
      
    } catch (error) {
      console.error('Failed to load default conversion map:', error);
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserConversionMap = async () => {
    if (!conversionMap) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedMap: ConversionMap = {
        header_row: headerRow,
        mappings: mappings.reduce((acc, mapping) => {
          if (mapping.isActive) {
            acc[mapping.excelHeader] = mapping.targetField;
          }
          return acc;
        }, {} as Record<string, string>)
      };
      
      await invoke('save_user_conversion_map', { conversionMap: updatedMap });
      setConversionMap(updatedMap);
      
      if (onConversionMapChange) {
        onConversionMapChange(updatedMap);
      }
      
    } catch (error) {
      console.error('Failed to save conversion map:', error);
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      });

      if (!selected || Array.isArray(selected)) return;

      const filePath = selected as string;
      const map = await invoke<ConversionMap>('load_conversion_map_from_file', { filePath });
      
      setConversionMap(map);
      setHeaderRow(map.header_row || 1);
      
      const uiMappings: HeaderMapping[] = Object.entries(map.mappings || {}).map(([excel, target]) => ({
        excelHeader: excel,
        targetField: target,
        isActive: true
      }));
      setMappings(uiMappings);
      
    } catch (error) {
      console.error('Failed to load conversion map from file:', error);
      setError(error as string);
    }
  };

  const saveToFile = async () => {
    if (!conversionMap) return;
    
    try {
      const selected = await save({
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      });

      if (!selected) return;

      const updatedMap: ConversionMap = {
        header_row: headerRow,
        mappings: mappings.reduce((acc, mapping) => {
          if (mapping.isActive) {
            acc[mapping.excelHeader] = mapping.targetField;
          }
          return acc;
        }, {} as Record<string, string>)
      };

      await invoke('save_conversion_map_to_file', { 
        conversionMap: updatedMap, 
        filePath: selected 
      });
      
    } catch (error) {
      console.error('Failed to save conversion map to file:', error);
      setError(error as string);
    }
  };

  const addMapping = () => {
    if (!newExcelHeader.trim() || !newTargetField) return;
    
    const newMapping: HeaderMapping = {
      excelHeader: newExcelHeader.trim(),
      targetField: newTargetField,
      isActive: true
    };
    
    setMappings([...mappings, newMapping]);
    setNewExcelHeader('');
    setNewTargetField('');
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const toggleMapping = (index: number) => {
    setMappings(mappings.map((mapping, i) => 
      i === index ? { ...mapping, isActive: !mapping.isActive } : mapping
    ));
  };

  const updateMapping = (index: number, field: 'excelHeader' | 'targetField', value: string) => {
    setMappings(mappings.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ));
  };

  if (!isVisible) return null;

  return (
    <div className="conversion-map-page">
      <NavigationHeader
        currentPage="conversion-map"
        onNavigate={onNavigate || (() => {})}
        title="Conversion Map Manager"
      />
      
      <div className="conversion-map-content">
          {error && (
            <div className="error-message">
              <p>Error: {error}</p>
            </div>
          )}
          
          <div className="controls-section">
            <div className="header-row-control">
              <label>
                Header Row: 
                <input 
                  type="number" 
                  value={headerRow} 
                  onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)}
                  min="1"
                  max="100"
                />
              </label>
            </div>
            
            <div className="button-group">
              <button onClick={loadDefaultConversionMap} disabled={isLoading}>
                Load Default
              </button>
              <button onClick={loadFromFile} disabled={isLoading}>
                Load from File
              </button>
              <button onClick={saveToFile} disabled={isLoading || !conversionMap}>
                Save to File
              </button>
              <button onClick={saveUserConversionMap} disabled={isLoading || !conversionMap}>
                Save User Map
              </button>
            </div>
          </div>

          <div className="add-mapping-section">
            <h3>Add New Mapping</h3>
            <div className="add-mapping-controls">
              <input
                type="text"
                placeholder="Excel Header"
                value={newExcelHeader}
                onChange={(e) => setNewExcelHeader(e.target.value)}
              />
              <select
                value={newTargetField}
                onChange={(e) => setNewTargetField(e.target.value)}
              >
                <option value="">Select Target Field</option>
                {availableFields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
              <button onClick={addMapping} disabled={!newExcelHeader.trim() || !newTargetField}>
                Add
              </button>
            </div>
          </div>

          <div className="mappings-section">
            <h3>Current Mappings ({mappings.length})</h3>
            <div className="mappings-list">
              {mappings.map((mapping, index) => (
                <div key={index} className={`mapping-item ${!mapping.isActive ? 'inactive' : ''}`}>
                  <div className="mapping-fields">
                    <input
                      type="text"
                      value={mapping.excelHeader}
                      onChange={(e) => updateMapping(index, 'excelHeader', e.target.value)}
                      placeholder="Excel Header"
                    />
                    <span>→</span>
                    <select
                      value={mapping.targetField}
                      onChange={(e) => updateMapping(index, 'targetField', e.target.value)}
                    >
                      {availableFields.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mapping-controls">
                    <button
                      onClick={() => toggleMapping(index)}
                      className={mapping.isActive ? 'active' : 'inactive'}
                    >
                      {mapping.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => removeMapping(index)} className="remove">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  );
};

export default ConversionMapManager;