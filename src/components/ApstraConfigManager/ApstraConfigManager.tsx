import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import { ApstraConfig, ApstraConfigUIState } from '../../types';
import NavigationHeader from '../NavigationHeader/NavigationHeader';
import './ApstraConfigManager.css';

interface ApstraConfigManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onConfigChange?: (config: ApstraConfig) => void;
  currentConfig?: ApstraConfig | null;
  onNavigate?: (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => void;
}

const ApstraConfigManager: React.FC<ApstraConfigManagerProps> = ({
  isVisible,
  onClose,
  onConfigChange,
  currentConfig,
  onNavigate
}) => {
  const [state, setState] = useState<ApstraConfigUIState>({
    isLoading: false,
    currentConfig: null,
    isTestingConnection: false,
    connectionStatus: 'unknown',
    validationErrors: []
  });

  const [formData, setFormData] = useState<ApstraConfig>({
    host: '',
    port: 443,
    username: '',
    password: '',
    blueprint_name: '',
    use_ssl: true,
    verify_ssl: false,
    timeout: 30
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isVisible && !state.currentConfig) {
      loadDefaultConfig();
    }
  }, [isVisible]);

  useEffect(() => {
    if (currentConfig) {
      setFormData({ ...currentConfig });
      setState(prev => ({ ...prev, currentConfig }));
    }
  }, [currentConfig]);

  const loadDefaultConfig = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const defaultConfig = await invoke<ApstraConfig>('load_default_apstra_config');
      setFormData(defaultConfig);
      setState(prev => ({ 
        ...prev, 
        currentConfig: defaultConfig,
        isLoading: false,
        connectionStatus: 'unknown',
        validationErrors: []
      }));
    } catch (error) {
      console.error('Failed to load default Apstra config:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        validationErrors: [`Failed to load default config: ${error}`]
      }));
    }
  };

  const handleFieldChange = (field: keyof ApstraConfig, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation errors when user starts editing
    if (state.validationErrors.length > 0) {
      setState(prev => ({ ...prev, validationErrors: [], connectionStatus: 'unknown' }));
    }
  };

  const validateConfig = (): boolean => {
    const errors: string[] = [];
    
    if (!formData.host.trim()) {
      errors.push('Host is required');
    }
    
    if (formData.port <= 0 || formData.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }
    
    if (!formData.username.trim()) {
      errors.push('Username is required');
    }
    
    if (!formData.blueprint_name.trim()) {
      errors.push('Blueprint name is required');
    }

    setState(prev => ({ ...prev, validationErrors: errors }));
    return errors.length === 0;
  };

  const testConnection = async () => {
    if (!validateConfig()) return;

    setState(prev => ({ ...prev, isTestingConnection: true, connectionStatus: 'unknown' }));
    
    try {
      const isConnected = await invoke<boolean>('test_apstra_connection', { 
        config: formData 
      });
      
      setState(prev => ({ 
        ...prev, 
        isTestingConnection: false,
        connectionStatus: isConnected ? 'success' : 'failed'
      }));
    } catch (error) {
      console.error('Connection test failed:', error);
      setState(prev => ({ 
        ...prev, 
        isTestingConnection: false,
        connectionStatus: 'failed',
        validationErrors: [`Connection test failed: ${error}`]
      }));
    }
  };

  const saveConfig = () => {
    if (!validateConfig()) return;
    
    setState(prev => ({ ...prev, currentConfig: { ...formData } }));
    
    if (onConfigChange) {
      onConfigChange({ ...formData });
    }
    
    // Optionally save to user config file
    saveToUserConfig();
  };

  const saveToUserConfig = async () => {
    try {
      await invoke('save_user_apstra_config', { config: formData });
      console.log('Apstra config saved to user preferences');
    } catch (error) {
      console.error('Failed to save user config:', error);
    }
  };

  const saveToFile = async () => {
    if (!validateConfig()) return;

    try {
      const filePath = await save({
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        defaultPath: 'apstra_config.json'
      });

      if (filePath) {
        await invoke('save_apstra_config_to_file', { 
          config: formData, 
          filePath 
        });
        console.log(`Apstra config saved to: ${filePath}`);
      }
    } catch (error) {
      console.error('Failed to save config to file:', error);
      setState(prev => ({ 
        ...prev, 
        validationErrors: [`Failed to save to file: ${error}`]
      }));
    }
  };

  const loadFromFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });

      if (selected && typeof selected === 'string') {
        setState(prev => ({ ...prev, isLoading: true }));
        
        const loadedConfig = await invoke<ApstraConfig>('load_apstra_config_from_file', { 
          filePath: selected 
        });
        
        setFormData(loadedConfig);
        setState(prev => ({ 
          ...prev, 
          currentConfig: loadedConfig,
          isLoading: false,
          connectionStatus: 'unknown',
          validationErrors: []
        }));
        
        console.log(`Apstra config loaded from: ${selected}`);
      }
    } catch (error) {
      console.error('Failed to load config from file:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        validationErrors: [`Failed to load from file: ${error}`]
      }));
    }
  };

  const resetToDefault = () => {
    loadDefaultConfig();
  };

  if (!isVisible) return null;

  return (
    <div className="apstra-config-page">
      <NavigationHeader
        currentPage="apstra-connection"
        onNavigate={onNavigate || (() => {})}
        title="Apstra Connection Manager"
      />
      
      <div className="apstra-config-content">
          {state.isLoading ? (
            <div className="loading-message">Loading configuration...</div>
          ) : (
            <>
              {state.validationErrors.length > 0 && (
                <div className="error-messages">
                  {state.validationErrors.map((error, index) => (
                    <div key={index} className="error-message">{error}</div>
                  ))}
                </div>
              )}

              <div className="config-form">
                <div className="form-section">
                  <h3>Connection Settings</h3>
                  
                  <div className="form-group">
                    <label htmlFor="host">Apstra Host</label>
                    <input
                      id="host"
                      type="text"
                      value={formData.host}
                      onChange={(e) => handleFieldChange('host', e.target.value)}
                      placeholder="10.85.192.59"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="port">Port</label>
                    <input
                      id="port"
                      type="number"
                      value={formData.port}
                      onChange={(e) => handleFieldChange('port', parseInt(e.target.value) || 443)}
                      min="1"
                      max="65535"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleFieldChange('username', e.target.value)}
                      placeholder="admin"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-input-group">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleFieldChange('password', e.target.value)}
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="blueprint">Blueprint Name</label>
                    <input
                      id="blueprint"
                      type="text"
                      value={formData.blueprint_name}
                      onChange={(e) => handleFieldChange('blueprint_name', e.target.value)}
                      placeholder="terra"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h3>Advanced Settings</h3>
                  
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.use_ssl ?? true}
                        onChange={(e) => handleFieldChange('use_ssl', e.target.checked)}
                      />
                      Use SSL/HTTPS
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.verify_ssl ?? false}
                        onChange={(e) => handleFieldChange('verify_ssl', e.target.checked)}
                      />
                      Verify SSL Certificate
                    </label>
                  </div>

                  <div className="form-group">
                    <label htmlFor="timeout">Timeout (seconds)</label>
                    <input
                      id="timeout"
                      type="number"
                      value={formData.timeout ?? 30}
                      onChange={(e) => handleFieldChange('timeout', parseInt(e.target.value) || 30)}
                      min="1"
                      max="300"
                    />
                  </div>
                </div>
              </div>

              <div className="connection-status">
                {state.connectionStatus === 'success' && (
                  <div className="status-success">✅ Connection successful</div>
                )}
                {state.connectionStatus === 'failed' && (
                  <div className="status-failed">❌ Connection failed</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="apstra-config-actions">
          <div className="action-group">
            <button
              onClick={testConnection}
              disabled={state.isTestingConnection || state.isLoading}
              className="test-button"
            >
              {state.isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          <div className="action-group">
            <button onClick={loadFromFile} disabled={state.isLoading}>
              Load from File
            </button>
            <button onClick={saveToFile} disabled={state.isLoading}>
              Save to File
            </button>
          </div>

          <div className="action-group">
            <button onClick={resetToDefault} disabled={state.isLoading}>
              Reset to Default
            </button>
            <button onClick={saveConfig} className="save-button" disabled={state.isLoading}>
              Apply Configuration
            </button>
          </div>
      </div>
    </div>
  );
};

export default ApstraConfigManager;