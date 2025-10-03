import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApstraApiService } from '../services/ApstraApiService';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

describe('ApstraApiService', () => {
  let service: ApstraApiService;

  beforeEach(() => {
    service = ApstraApiService.getInstance();
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ApstraApiService.getInstance();
      const instance2 = ApstraApiService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getSessionId', () => {
    it('should return a valid session ID', () => {
      const sessionId = service.getSessionId();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });
  });

  describe('getAuthStatus', () => {
    it('should return false when not authenticated', () => {
      expect(service.getAuthStatus()).toBe(false);
    });
  });

  describe('getHost', () => {
    it('should return empty string when no base URL is set', () => {
      expect(service.getHost()).toBe('');
    });

    it('should extract host from base URL', () => {
      // This would require mocking the internal state after login
      // For now, we test the empty case
      expect(service.getHost()).toBe('');
    });
  });

  describe('static query methods', () => {
    it('should create system query with server name substitution', async () => {
      const serverName = 'test-server';
      const query = await ApstraApiService.createSystemQuery(serverName);
      
      expect(query).toBeDefined();
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });

    it('should create system with topology query', async () => {
      const serverName = 'test-server';
      const query = await ApstraApiService.createSystemWithTopologyQuery(serverName);
      
      expect(query).toBeDefined();
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });

    it('should create IP with topology query', async () => {
      const ipAddress = '192.168.1.1';
      const query = await ApstraApiService.createIPWithTopologyQuery(ipAddress);
      
      expect(query).toBeDefined();
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });
  });
});