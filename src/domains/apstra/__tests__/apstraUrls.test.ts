import { describe, it, expect } from 'vitest';
import { 
  generateApstraUrls, 
  extractBlueprintId, 
  extractNodeId, 
  isValidApstraHost, 
  normalizeApstraHost 
} from '../utils/apstraUrls';

describe('apstraUrls utilities', () => {
  const mockHost = 'apstra.example.com';
  const mockBlueprintId = '12345678-1234-1234-1234-123456789abc';
  const mockNodeId = '87654321-4321-4321-4321-cba987654321';

  describe('generateApstraUrls', () => {
    it('should generate blueprint URL', () => {
      const url = generateApstraUrls.blueprint({
        host: mockHost,
        blueprintId: mockBlueprintId
      });

      expect(url).toBe(`https://${mockHost}/#/blueprints/${mockBlueprintId}/staged`);
    });

    it('should generate system URL', () => {
      const url = generateApstraUrls.system({
        host: mockHost,
        blueprintId: mockBlueprintId,
        nodeId: mockNodeId
      });

      expect(url).toBe(`https://${mockHost}/#/blueprints/${mockBlueprintId}/staged/physical/selection/node-preview/${mockNodeId}`);
    });

    it('should generate interface URL', () => {
      const url = generateApstraUrls.interface({
        host: mockHost,
        blueprintId: mockBlueprintId,
        nodeId: mockNodeId
      });

      expect(url).toBe(`https://${mockHost}/#/blueprints/${mockBlueprintId}/staged/physical/selection/node-preview/${mockNodeId}`);
    });

    it('should generate pod URL', () => {
      const url = generateApstraUrls.pod({
        host: mockHost,
        blueprintId: mockBlueprintId,
        nodeId: mockNodeId
      });

      expect(url).toBe(`https://${mockHost}/#/blueprints/${mockBlueprintId}/staged/physical/selection/node-preview/${mockNodeId}`);
    });

    it('should generate rack URL', () => {
      const url = generateApstraUrls.rack({
        host: mockHost,
        blueprintId: mockBlueprintId,
        nodeId: mockNodeId
      });

      expect(url).toBe(`https://${mockHost}/#/blueprints/${mockBlueprintId}/staged/physical/selection/node-preview/${mockNodeId}`);
    });

    it('should generate connectivity URL', () => {
      const url = generateApstraUrls.connectivity({
        host: mockHost,
        blueprintId: mockBlueprintId
      });

      expect(url).toBe(`https://${mockHost}/#/blueprints/${mockBlueprintId}/staged/connectivity`);
    });

    it('should generate analytics URL', () => {
      const url = generateApstraUrls.analytics({
        host: mockHost,
        blueprintId: mockBlueprintId
      });

      expect(url).toBe(`https://${mockHost}/#/blueprints/${mockBlueprintId}/staged/analytics`);
    });
  });

  describe('extractBlueprintId', () => {
    it('should extract blueprint ID from valid URL', () => {
      const url = `https://${mockHost}/#/blueprints/${mockBlueprintId}/staged`;
      const extracted = extractBlueprintId(url);
      expect(extracted).toBe(mockBlueprintId);
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/invalid-url';
      const extracted = extractBlueprintId(url);
      expect(extracted).toBeNull();
    });

    it('should handle URLs with additional path segments', () => {
      const url = `https://${mockHost}/#/blueprints/${mockBlueprintId}/staged/physical/selection`;
      const extracted = extractBlueprintId(url);
      expect(extracted).toBe(mockBlueprintId);
    });
  });

  describe('extractNodeId', () => {
    it('should extract node ID from valid URL', () => {
      const url = `https://${mockHost}/#/blueprints/${mockBlueprintId}/staged/physical/selection/node-preview/${mockNodeId}`;
      const extracted = extractNodeId(url);
      expect(extracted).toBe(mockNodeId);
    });

    it('should return null for URL without node preview', () => {
      const url = `https://${mockHost}/#/blueprints/${mockBlueprintId}/staged`;
      const extracted = extractNodeId(url);
      expect(extracted).toBeNull();
    });
  });

  describe('isValidApstraHost', () => {
    it('should validate correct hostnames', () => {
      const validHosts = [
        'apstra.example.com',
        '10.85.192.59',
        'localhost',
        'apstra-controller.local',
        '192.168.1.100'
      ];

      validHosts.forEach(host => {
        expect(isValidApstraHost(host)).toBe(true);
      });
    });

    it('should reject invalid hostnames', () => {
      const invalidHosts = [
        '',
        'invalid host with spaces',
        'host@with@symbols',
        'host:with:colons',
        'host/with/slashes'
      ];

      invalidHosts.forEach(host => {
        expect(isValidApstraHost(host)).toBe(false);
      });
    });
  });

  describe('normalizeApstraHost', () => {
    it('should remove https protocol', () => {
      const host = normalizeApstraHost('https://apstra.example.com');
      expect(host).toBe('apstra.example.com');
    });

    it('should remove http protocol', () => {
      const host = normalizeApstraHost('http://apstra.example.com');
      expect(host).toBe('apstra.example.com');
    });

    it('should leave host unchanged if no protocol', () => {
      const host = normalizeApstraHost('apstra.example.com');
      expect(host).toBe('apstra.example.com');
    });

    it('should handle IP addresses', () => {
      const host = normalizeApstraHost('https://10.85.192.59');
      expect(host).toBe('10.85.192.59');
    });
  });
});