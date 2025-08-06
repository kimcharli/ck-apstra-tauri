import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import NavigationHeader from '../NavigationHeader/NavigationHeader';
import { logger } from '../../services/LoggingService';
import './ToolsPage.css';

interface ToolsPageProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => void;
}

interface Blueprint {
  label: string;
  id: string;
}

const ToolsPage: React.FC<ToolsPageProps> = ({
  isVisible,
  onClose,
  onNavigate
}) => {
  const [systemSearchValue, setSystemSearchValue] = useState('CHA08P22L23');
  const [systemBlueprintLabel, setSystemBlueprintLabel] = useState('');
  const [ipSearchValue, setIpSearchValue] = useState('10.90.194.157/32');
  const [ipBlueprintLabel, setIpBlueprintLabel] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([
    { label: 'DH50-Colo1', id: '32f27ec4-c6bf-4f2e-a00a-8cd7f674f369' },
    { label: 'DH2-Colo2', id: '9818f405-40e8-4b7d-92eb-527a4f7d6246' },
    { label: 'DH15-Colo1', id: '7f468d2b-94f2-4efa-a2fd-68653db7fa89' },
    { label: 'DH4-Colo2', id: '9059ee6c-5ac2-4fee-bd65-83d429ccf850' }
  ]);

  const handleSystemSearch = async () => {
    if (!systemSearchValue.trim()) return;
    
    logger.logButtonClick('System Search', 'ToolsPage', { 
      searchValue: systemSearchValue, 
      blueprintLabel: systemBlueprintLabel 
    });
    logger.logWorkflowStart('System Search', {
      searchTerm: systemSearchValue,
      blueprint: systemBlueprintLabel,
      timestamp: new Date().toISOString()
    });
    
    setIsSearching(true);
    try {
      // TODO: Implement actual system search API call
      console.log('Searching for system:', systemSearchValue, 'in blueprint:', systemBlueprintLabel);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock search results would be handled here
      logger.logWorkflowComplete('System Search', {
        status: 'completed',
        searchTerm: systemSearchValue,
        blueprint: systemBlueprintLabel,
        resultsFound: 'simulated'
      });
      
      alert(`System search completed for: ${systemSearchValue}`);
    } catch (error) {
      console.error('System search failed:', error);
      logger.logError('API_CALL', 'System search failed', {
        searchTerm: systemSearchValue,
        blueprint: systemBlueprintLabel,
        error: error.toString()
      });
      alert('System search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleIpSearch = async () => {
    if (!ipSearchValue.trim()) return;
    
    logger.logButtonClick('IP Search', 'ToolsPage', { 
      searchValue: ipSearchValue, 
      blueprintLabel: ipBlueprintLabel 
    });
    logger.logWorkflowStart('IP Search', {
      searchTerm: ipSearchValue,
      blueprint: ipBlueprintLabel,
      timestamp: new Date().toISOString()
    });
    
    setIsSearching(true);
    try {
      // TODO: Implement actual IP search API call
      console.log('Searching for IP:', ipSearchValue, 'in blueprint:', ipBlueprintLabel);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock search results would be handled here
      logger.logWorkflowComplete('IP Search', {
        status: 'completed',
        searchTerm: ipSearchValue,
        blueprint: ipBlueprintLabel,
        resultsFound: 'simulated'
      });
      
      alert(`IP search completed for: ${ipSearchValue}`);
    } catch (error) {
      console.error('IP search failed:', error);
      logger.logError('API_CALL', 'IP search failed', {
        searchTerm: ipSearchValue,
        blueprint: ipBlueprintLabel,
        error: error.toString()
      });
      alert('IP search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBlueprintAction = (action: 'leafs' | 'dump', blueprint: Blueprint) => {
    logger.logButtonClick(`Blueprint ${action}`, 'ToolsPage', { 
      action, 
      blueprintLabel: blueprint.label, 
      blueprintId: blueprint.id 
    });
    logger.logWorkflowStart(`Blueprint ${action.toUpperCase()}`, {
      blueprint: blueprint.label,
      blueprintId: blueprint.id,
      action: action,
      timestamp: new Date().toISOString()
    });
    
    console.log(`${action} action for blueprint:`, blueprint.label, blueprint.id);
    alert(`${action.toUpperCase()} action triggered for ${blueprint.label}`);
  };

  if (!isVisible) return null;

  return (
    <div className="tools-page">
      <NavigationHeader
        currentPage="tools"
        onNavigate={onNavigate}
        title="Apstra Tools"
      />
      
      <div className="tools-content">
        {/* System Search Section */}
        <section className="search-section">
          <h2>System Search</h2>
          <div className="search-form">
            <div className="search-inputs">
              <input
                type="text"
                value={systemSearchValue}
                onChange={(e) => setSystemSearchValue(e.target.value)}
                placeholder="Enter system name"
                className="search-input"
              />
              <input
                type="text"
                value={systemBlueprintLabel}
                onChange={(e) => setSystemBlueprintLabel(e.target.value)}
                placeholder="Blueprint Label (Optional)"
                className="search-input blueprint-input"
              />
              <button 
                onClick={handleSystemSearch}
                disabled={isSearching || !systemSearchValue.trim()}
                className="search-button"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </section>

        {/* IP Search Section */}
        <section className="search-section">
          <h2>IP Search</h2>
          <div className="search-form">
            <div className="search-inputs">
              <input
                type="text"
                value={ipSearchValue}
                onChange={(e) => setIpSearchValue(e.target.value)}
                placeholder="Enter IP address/CIDR"
                className="search-input ip-input"
              />
              <input
                type="text"
                value={ipBlueprintLabel}
                onChange={(e) => setIpBlueprintLabel(e.target.value)}
                placeholder="Blueprint Label (Optional)"
                className="search-input blueprint-input"
              />
              <button 
                onClick={handleIpSearch}
                disabled={isSearching || !ipSearchValue.trim()}
                className="search-button"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </section>

        {/* Blueprints Table Section */}
        <section className="blueprints-section">
          <div className="blueprints-header">
            <h3>
              <span className="blueprints-icon">📋</span>
              Blueprints: {blueprints.length}
            </h3>
          </div>
          
          <div className="blueprints-table-container">
            <table className="blueprints-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blueprints.map((blueprint, index) => (
                  <tr key={blueprint.id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                    <td>
                      <a href="#" className="blueprint-link">
                        {blueprint.label}
                      </a>
                    </td>
                    <td className="blueprint-id">{blueprint.id}</td>
                    <td className="blueprint-actions">
                      <button
                        onClick={() => handleBlueprintAction('leafs', blueprint)}
                        className="action-link leafs-link"
                      >
                        Leafs
                      </button>
                      <span className="action-separator">|</span>
                      <button
                        onClick={() => handleBlueprintAction('dump', blueprint)}
                        className="action-link dump-link"
                      >
                        Dump
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ToolsPage;