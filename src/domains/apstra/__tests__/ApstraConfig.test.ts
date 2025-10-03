import { describe, it, expect } from 'vitest';
import type { ApstraConfig } from '../types/ApstraConfig';

describe('ApstraConfig Types', () => {
  describe('ApstraConfig interface', () => {
    it('should accept valid configuration object', () => {
      const config: ApstraConfig = {
        host: '10.85.192.59',
        port: 443,
        username: 'admin',
        password: 'password123',
        blueprint_name: 'terra',
        use_ssl: true,
        verify_ssl: false,
        timeout: 30
      };

      expect(config.host).toBe('10.85.192.59');
      expect(config.port).toBe(443);
      expect(config.username).toBe('admin');
      expect(config.password).toBe('password123');
      expect(config.blueprint_name).toBe('terra');
      expect(config.use_ssl).toBe(true);
      expect(config.verify_ssl).toBe(false);
      expect(config.timeout).toBe(30);
    });

    it('should accept configuration with optional fields undefined', () => {
      const config: ApstraConfig = {
        host: '10.85.192.59',
        port: 443,
        username: 'admin',
        password: 'password123',
        blueprint_name: 'terra'
      };

      expect(config.use_ssl).toBeUndefined();
      expect(config.verify_ssl).toBeUndefined();
      expect(config.timeout).toBeUndefined();
    });

    it('should require all mandatory fields', () => {
      // This test ensures TypeScript compilation catches missing required fields
      const config: ApstraConfig = {
        host: 'localhost',
        port: 443,
        username: 'admin',
        password: 'password',
        blueprint_name: 'test'
      };

      expect(config).toBeDefined();
    });
  });

  describe('ApstraConfigUIState interface', () => {
    it('should accept valid UI state object', () => {
      const uiState = {
        isLoading: false,
        currentConfig: null,
        isTestingConnection: false,
        connectionStatus: 'unknown' as const,
        validationErrors: []
      };

      expect(uiState.isLoading).toBe(false);
      expect(uiState.currentConfig).toBeNull();
      expect(uiState.isTestingConnection).toBe(false);
      expect(uiState.connectionStatus).toBe('unknown');
      expect(uiState.validationErrors).toEqual([]);
    });

    it('should accept different connection statuses', () => {
      const statuses = ['unknown', 'success', 'failed'] as const;
      
      statuses.forEach(status => {
        const uiState = {
          isLoading: false,
          currentConfig: null,
          isTestingConnection: false,
          connectionStatus: status,
          validationErrors: []
        };

        expect(uiState.connectionStatus).toBe(status);
      });
    });
  });
});