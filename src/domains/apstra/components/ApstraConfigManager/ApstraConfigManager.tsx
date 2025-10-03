import React, { useState, useEffect, useReducer } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import { ApstraConfig, ApstraConfigUIState } from '../../types';
import NavigationHeader from '../../../../components/NavigationHeader/NavigationHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthStatus } from '../../../../hooks/useAuthStatus';
import './ApstraConfigManager.css';

interface ApstraConfigManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onConfigChange?: (config: ApstraConfig) => void;
  currentConfig?: ApstraConfig | null;
  onNavigate?: (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => void;
}

const initialState: ApstraConfigUIState = {
  isLoading: false,
  currentConfig: null,
  isTestingConnection: false,
  connectionStatus: 'unknown',
  validationErrors: [],
};

type Action = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_CONFIG'; payload: ApstraConfig | null }
  | { type: 'SET_IS_TESTING_CONNECTION'; payload: boolean }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'unknown' | 'success' | 'failed' }
  | { type: 'SET_VALIDATION_ERRORS'; payload: string[] }
  | { type: 'RESET' };

const reducer = (state: ApstraConfigUIState, action: Action): ApstraConfigUIState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CURRENT_CONFIG':
      return { ...state, currentConfig: action.payload };
    case 'SET_IS_TESTING_CONNECTION':
      return { ...state, isTestingConnection: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

const ApstraConfigManager: React.FC<ApstraConfigManagerProps> = ({
  isVisible,
  onConfigChange,
  currentConfig,
  onNavigate
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const [isConnecting, setIsConnecting] = useState(false);
  
  // Use centralized authentication
  const { authenticate, logout } = useAuth();
  const { isAuthenticated } = useAuthStatus();

  const [formData, setFormData] = useState<ApstraConfig>({
    host: '',
    port: 443,
    username: '',
    password: 'admin',
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
      dispatch({ type: 'SET_CURRENT_CONFIG', payload: currentConfig });
    }
  }, [currentConfig]);

  const loadDefaultConfig = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const defaultConfig = await invoke<ApstraConfig>('load_default_apstra_config');
      setFormData(defaultConfig);
      dispatch({ type: 'SET_CURRENT_CONFIG', payload: defaultConfig });
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'unknown' });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [] });
    } catch (error) {
      console.error('Failed to load default Apstra config:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [`Failed to load default config: ${error}`] });
    }
  };

  const handleFieldChange = (field: keyof ApstraConfig, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation errors when user starts editing
    if (state.validationErrors.length > 0) {
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [] });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'unknown' });
    }

    // If connection-related fields change, invalidate authentication
    if (['host', 'port', 'username', 'password', 'use_ssl'].includes(field as string) && isAuthenticated) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'unknown' });
      logout(); // Use centralized logout
      console.log(`Apstra configuration field '${field}' changed. Authentication invalidated.`);
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

    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
    return errors.length === 0;
  };

  const connectToApstra = async () => {
    if (!validateConfig()) return;

    setIsConnecting(true);
    dispatch({ type: 'SET_IS_TESTING_CONNECTION', payload: true });

    try {
      // First save the configuration
      await saveToUserConfig();

      // Construct base URL
      const protocol = formData.use_ssl !== false ? 'https' : 'http';
      const baseUrl = `${protocol}://${formData.host}:${formData.port}`;

      console.log('Authenticating with Apstra:', formData.host);

      // Use centralized authentication
      await authenticate(baseUrl, formData.username, formData.password);
      
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'success' });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [] });

      console.log('Successfully authenticated with Apstra.');
      
    } catch (error: any) {
      console.error('Authentication failed:', error);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'failed' });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [`Authentication failed: ${error.message || error}`] });
    } finally {
      setIsConnecting(false);
      dispatch({ type: 'SET_IS_TESTING_CONNECTION', payload: false });
    }
  };


  const saveConfig = () => {
    if (!validateConfig()) return;
    
    dispatch({ type: 'SET_CURRENT_CONFIG', payload: { ...formData } });
    
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
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [`Failed to save to file: ${error}`] });
    }
  };

  const loadFromFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });

      if (selected && typeof selected === 'string') {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const loadedConfig = await invoke<ApstraConfig>('load_apstra_config_from_file', { 
          filePath: selected 
        });
        
        setFormData(loadedConfig);
        dispatch({ type: 'SET_CURRENT_CONFIG', payload: loadedConfig });
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'unknown' });
        dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [] });
        
        console.log(`Apstra config loaded from: ${selected}`);
      }
    } catch (error) {
      console.error('Failed to load config from file:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [`Failed to load from file: ${error}`] });
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
                  <h3>Apstra Configuration</h3>
                  
                  <table className="config-table">
                    <tbody>
                      <tr>
                        <td className="field-label">
                          <label htmlFor="host">Host:</label>
                        </td>
                        <td className="field-input">
                          <input
                            id="host"
                            type="text"
                            value={formData.host}
                            onChange={(e) => handleFieldChange('host', e.target.value)}
                            placeholder="10.85.192.59"
                          />
                        </td>
                        <td className="field-label">
                          <label htmlFor="port">Port:</label>
                        </td>
                        <td className="field-input">
                          <input
                            id="port"
                            type="number"
                            value={formData.port}
                            onChange={(e) => handleFieldChange('port', parseInt(e.target.value) || 443)}
                            min="1"
                            max="65535"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">
                          <label htmlFor="username">Username:</label>
                        </td>
                        <td className="field-input">
                          <input
                            id="username"
                            type="text"
                            value={formData.username}
                            onChange={(e) => handleFieldChange('username', e.target.value)}
                            placeholder="admin"
                          />
                        </td>
                        <td className="field-label">
                          <label htmlFor="password">Password:</label>
                        </td>
                        <td className="field-input">
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
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">
                          <label htmlFor="blueprint">Blueprint:</label>
                        </td>
                        <td className="field-input">
                          <input
                            id="blueprint"
                            type="text"
                            value={formData.blueprint_name}
                            onChange={(e) => handleFieldChange('blueprint_name', e.target.value)}
                            placeholder="terra"
                          />
                        </td>
                        <td className="field-label">
                          <label htmlFor="timeout">Timeout:</label>
                        </td>
                        <td className="field-input">
                          <input
                            id="timeout"
                            type="number"
                            value={formData.timeout ?? 30}
                            onChange={(e) => handleFieldChange('timeout', parseInt(e.target.value) || 30)}
                            min="1"
                            max="300"
                          />
                          <span className="field-unit">sec</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">SSL:</td>
                        <td className="field-input">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={formData.use_ssl ?? true}
                              onChange={(e) => handleFieldChange('use_ssl', e.target.checked)}
                            />
                            Use HTTPS
                          </label>
                        </td>
                        <td className="field-label">Verify:</td>
                        <td className="field-input">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={formData.verify_ssl ?? false}
                              onChange={(e) => handleFieldChange('verify_ssl', e.target.checked)}
                            />
                            Verify Cert
                          </label>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}
        </div>

        <div className="apstra-config-actions">
          <div className="action-group">
            <button
              onClick={connectToApstra}
              disabled={isConnecting || state.isLoading || state.isTestingConnection}
              className={`connect-button ${isAuthenticated ? 'connected' : ''}`}
            >
              {state.isTestingConnection ? <div className="spinner" /> : isConnecting ? 'Connecting...' : isAuthenticated ? '✅ Connected' : 'Connect to Apstra'}
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