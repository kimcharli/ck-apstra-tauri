/**
 * Utility functions for generating Apstra web URLs
 */

export interface ApstraUrlParams {
  host: string;
  blueprintId: string;
  nodeId?: string;
}

export const generateApstraUrls = {
  /**
   * Generate blueprint staged page URL
   */
  blueprint: ({ host, blueprintId }: ApstraUrlParams): string => {
    return `https://${host}/#/blueprints/${blueprintId}/staged`;
  },

  /**
   * Generate system detail page URL
   */
  system: ({ host, blueprintId, nodeId }: ApstraUrlParams): string => {
    if (!nodeId) return '';
    return `https://${host}/#/blueprints/${blueprintId}/staged/physical/selection/node-preview/${nodeId}`;
  },

  /**
   * Generate pod preview page URL
   */
  pod: ({ host, blueprintId, nodeId }: ApstraUrlParams): string => {
    if (!nodeId) return '';
    return `https://${host}/#/blueprints/${blueprintId}/staged/physical/selection/pod-preview/${nodeId}`;
  },

  /**
   * Generate rack preview page URL
   */
  rack: ({ host, blueprintId, nodeId }: ApstraUrlParams): string => {
    if (!nodeId) return '';
    return `https://${host}/#/blueprints/${blueprintId}/staged/physical/selection/rack-preview/${nodeId}`;
  },

  /**
   * Generate interface detail page URL
   */
  interface: ({ host, blueprintId, nodeId }: ApstraUrlParams): string => {
    if (!nodeId) return '';
    return `https://${host}/#/blueprints/${blueprintId}/staged/physical/selection/interface-preview/${nodeId}`;
  }
};