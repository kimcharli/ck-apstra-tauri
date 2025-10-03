/**
 * Utility functions for generating Apstra UI URLs
 */

interface ApstraUrlParams {
  host: string;
  blueprintId: string;
  nodeId?: string;
}

interface BlueprintUrlParams {
  host: string;
  blueprintId: string;
}

interface SystemUrlParams extends ApstraUrlParams {
  nodeId: string;
}

interface InterfaceUrlParams extends ApstraUrlParams {
  nodeId: string;
}

interface PodUrlParams extends ApstraUrlParams {
  nodeId: string;
}

interface RackUrlParams extends ApstraUrlParams {
  nodeId: string;
}

export const generateApstraUrls = {
  /**
   * Generate URL for blueprint overview
   */
  blueprint: ({ host, blueprintId }: BlueprintUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged`;
  },

  /**
   * Generate URL for system node in blueprint
   */
  system: ({ host, blueprintId, nodeId }: SystemUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged/physical/selection/node-preview/${nodeId}`;
  },

  /**
   * Generate URL for interface node in blueprint
   */
  interface: ({ host, blueprintId, nodeId }: InterfaceUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged/physical/selection/node-preview/${nodeId}`;
  },

  /**
   * Generate URL for pod node in blueprint
   */
  pod: ({ host, blueprintId, nodeId }: PodUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged/physical/selection/node-preview/${nodeId}`;
  },

  /**
   * Generate URL for rack node in blueprint
   */
  rack: ({ host, blueprintId, nodeId }: RackUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged/physical/selection/node-preview/${nodeId}`;
  },

  /**
   * Generate URL for connectivity view in blueprint
   */
  connectivity: ({ host, blueprintId }: BlueprintUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged/connectivity`;
  },

  /**
   * Generate URL for analytics view in blueprint
   */
  analytics: ({ host, blueprintId }: BlueprintUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged/analytics`;
  },

  /**
   * Generate URL for security policies in blueprint
   */
  security: ({ host, blueprintId }: BlueprintUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged/security-policies`;
  },

  /**
   * Generate URL for virtual networks in blueprint
   */
  virtualNetworks: ({ host, blueprintId }: BlueprintUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged/virtual-networks`;
  },

  /**
   * Generate URL for routing zones in blueprint
   */
  routingZones: ({ host, blueprintId }: BlueprintUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged/routing-zones`;
  }
};

/**
 * Extract blueprint ID from Apstra URL
 */
export const extractBlueprintId = (url: string): string | null => {
  const match = url.match(/blueprints\/([a-f0-9-]+)/);
  return match ? match[1] : null;
};

/**
 * Extract node ID from Apstra URL
 */
export const extractNodeId = (url: string): string | null => {
  const match = url.match(/node-preview\/([a-f0-9-]+)/);
  return match ? match[1] : null;
};

/**
 * Validate if a string looks like an Apstra host
 */
export const isValidApstraHost = (host: string): boolean => {
  // Basic validation for host format
  const hostPattern = /^[a-zA-Z0-9.-]+$/;
  return hostPattern.test(host) && host.length > 0;
};

/**
 * Normalize Apstra host (remove protocol if present)
 */
export const normalizeApstraHost = (host: string): string => {
  return host.replace(/^https?:\/\//, '');
};