import React from 'react';
import ApstraButton from '../components/ApstraButton/ApstraButton';
import { generateApstraUrls } from './apstraUrls';
import { apstraApiService } from '../services/ApstraApiService';

/**
 * Get the Apstra host with fallback
 */
export const getApstraHost = (): string => {
  return apstraApiService.getHost() || '10.85.192.59';
};

/**
 * Clean host format for URL generation (remove protocol and port if present)
 */
export const cleanHostForUrl = (host: string): string => {
  return host.replace(/https?:\/\//, '').replace(/:\d+$/, '');
};

/**
 * Render an Apstra system button with dynamic node ID lookup
 * This is the common function used by both ToolsPage and ProvisioningTable
 */
export const renderApstraSystemButtonWithLookup = (
  label: string,
  blueprintId: string,
  blueprintName: string,
  title?: string
): React.ReactNode => {
  if (!label || label === '-') {
    return <span className="no-data">{label || '-'}</span>;
  }

  return (
    <ApstraButton
      type="system"
      label={label}
      url="" // Will be generated dynamically on click
      title={title || `Click to open system ${label} in Apstra blueprint ${blueprintName}`}
      onClick={async () => {
        console.log('🔍 Fetching node ID for system:', label);
        try {
          // Use the same API as ToolsPage to get system info
          const response = await apstraApiService.searchSystemsWithTopology(blueprintId, label);
          
          if (response.count > 0 && response.items[0]?.system?.id) {
            const nodeId = response.items[0].system.id;
            console.log('✅ Found node ID for', label, ':', nodeId);
            
            // Generate and open the URL with real node ID
            const host = cleanHostForUrl(getApstraHost());
            const systemUrl = generateApstraUrls.system({
              host,
              blueprintId,
              nodeId
            });
            console.log('🔗 Opening URL:', systemUrl);
            
            // Open the URL (using Tauri's shell API)
            const { open } = await import('@tauri-apps/api/shell');
            await open(systemUrl);
          } else {
            console.warn('❌ Node ID not found for system:', label);
            alert(`System "${label}" not found in blueprint ${blueprintName}`);
          }
        } catch (error) {
          console.error('❌ Failed to fetch system node ID:', error);
          alert(`Failed to find system "${label}": ${error}`);
        }
      }}
    />
  );
};

/**
 * Render an Apstra blueprint button with proper URL generation
 */
export const renderApstraBlueprintButton = (
  label: string,
  blueprintId: string,
  title?: string
): React.ReactNode => {
  if (!label || label === '-') {
    return <span className="no-data">{label || '-'}</span>;
  }

  try {
    const host = cleanHostForUrl(getApstraHost());
    const blueprintUrl = generateApstraUrls.blueprint({
      host,
      blueprintId
    });
    
    return (
      <ApstraButton
        type="blueprint"
        label={label}
        url={blueprintUrl}
        title={title || `Open blueprint ${label} in Apstra`}
      />
    );
  } catch (error) {
    console.warn('Failed to generate blueprint URL:', error);
    return <span className="blueprint-name">{label}</span>;
  }
};

/**
 * Render an Apstra pod button with proper URL generation
 */
export const renderApstraPodButton = (
  label: string,
  blueprintId: string,
  nodeId: string,
  title?: string
): React.ReactNode => {
  if (!label || label === '-') {
    return <span className="no-data">{label || '-'}</span>;
  }

  try {
    const host = cleanHostForUrl(getApstraHost());
    const podUrl = generateApstraUrls.pod({
      host,
      blueprintId,
      nodeId
    });
    
    return (
      <ApstraButton
        type="pod"
        label={label}
        url={podUrl}
        title={title || `Open pod ${label} in Apstra`}
      />
    );
  } catch (error) {
    console.warn('Failed to generate pod URL:', error);
    return <span className="pod-name">{label}</span>;
  }
};

/**
 * Render an Apstra rack button with proper URL generation
 */
export const renderApstraRackButton = (
  label: string,
  blueprintId: string,
  nodeId: string,
  title?: string
): React.ReactNode => {
  if (!label || label === '-') {
    return <span className="no-data">{label || '-'}</span>;
  }

  try {
    const host = cleanHostForUrl(getApstraHost());
    const rackUrl = generateApstraUrls.rack({
      host,
      blueprintId,
      nodeId
    });
    
    return (
      <ApstraButton
        type="rack"
        label={label}
        url={rackUrl}
        title={title || `Open rack ${label} in Apstra`}
      />
    );
  } catch (error) {
    console.warn('Failed to generate rack URL:', error);
    return <span className="rack-name">{label}</span>;
  }
};

/**
 * Render an Apstra interface button with proper URL generation
 */
export const renderApstraInterfaceButton = (
  label: string,
  blueprintId: string,
  nodeId: string,
  title?: string
): React.ReactNode => {
  if (!label || label === '-') {
    return <span className="no-data">{label || '-'}</span>;
  }

  try {
    const host = cleanHostForUrl(getApstraHost());
    const interfaceUrl = generateApstraUrls.interface({
      host,
      blueprintId,
      nodeId
    });
    
    return (
      <ApstraButton
        type="interface"
        label={label}
        url={interfaceUrl}
        title={title || `Open interface ${label} in Apstra`}
      />
    );
  } catch (error) {
    console.warn('Failed to generate interface URL:', error);
    return <span className="interface-name">{label}</span>;
  }
};