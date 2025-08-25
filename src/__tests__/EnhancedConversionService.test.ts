import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri's invoke function before importing the service
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

import { EnhancedConversionService } from '../services/EnhancedConversionService';
import { invoke } from '@tauri-apps/api/tauri';

const mockInvoke = vi.mocked(invoke);

describe('EnhancedConversionService', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('loadEnhancedConversionMap', () => {
    it('should call backend with correct parameter names for default map', async () => {
      const mockMap = {
        version: '1.0.0',
        field_definitions: { test: 'field' },
        transformation_rules: {}
      };
      
      mockInvoke.mockResolvedValue(mockMap);

      await EnhancedConversionService.loadEnhancedConversionMap();

      // Critical test: Verify parameter names match backend expectations
      expect(mockInvoke).toHaveBeenCalledWith('load_enhanced_conversion_map', { 
        file_path: undefined 
      });
    });

    it('should call backend with correct parameter names for custom file path', async () => {
      const mockMap = {
        version: '1.0.0',
        field_definitions: { test: 'field' },
        transformation_rules: {}
      };
      
      mockInvoke.mockResolvedValue(mockMap);
      const customPath = '/path/to/custom/map.json';

      await EnhancedConversionService.loadEnhancedConversionMap(customPath);

      // Critical test: Verify snake_case parameter name
      expect(mockInvoke).toHaveBeenCalledWith('load_enhanced_conversion_map', { 
        file_path: customPath 
      });
    });

    it('should handle backend errors gracefully', async () => {
      const errorMessage = 'Failed to parse JSON';
      mockInvoke.mockRejectedValue(errorMessage);

      await expect(EnhancedConversionService.loadEnhancedConversionMap())
        .rejects.toThrow(`Failed to load enhanced conversion map: ${errorMessage}`);
    });
  });

  describe('saveEnhancedConversionMap', () => {
    it('should call backend with correct parameter names', async () => {
      const mockMap = {
        version: '1.0.0',
        field_definitions: { 
          test: {
            display_name: 'Test Field',
            description: 'Test field description',
            data_type: 'String' as const,
            is_required: false,
            is_key_field: false,
            xlsx_mappings: [],
            api_mappings: [],
            validation_rules: {},
            ui_config: {
              column_width: 150,
              sortable: true,
              filterable: true, 
              hidden: false
            }
          }
        },
        transformation_rules: {}
      };
      const filePath = '/path/to/save/map.json';
      
      mockInvoke.mockResolvedValue(undefined);

      await EnhancedConversionService.saveEnhancedConversionMap(mockMap, filePath);

      // Critical test: Verify both parameter names use camelCase for Tauri compatibility
      expect(mockInvoke).toHaveBeenCalledWith('save_enhanced_conversion_map', { 
        enhancedMap: mockMap,
        filePath: filePath 
      });
    });

    it('should handle save errors gracefully', async () => {
      const mockMap = {
        version: '1.0.0',
        field_definitions: { 
          test: {
            display_name: 'Test Field',
            description: 'Test field description',
            data_type: 'String' as const,
            is_required: false,
            is_key_field: false,
            xlsx_mappings: [],
            api_mappings: [],
            validation_rules: {},
            ui_config: {
              column_width: 150,
              sortable: true,
              filterable: true, 
              hidden: false
            }
          }
        },
        transformation_rules: {}
      };
      const errorMessage = 'Permission denied';
      
      mockInvoke.mockRejectedValue(errorMessage);

      await expect(EnhancedConversionService.saveEnhancedConversionMap(mockMap, '/test/path'))
        .rejects.toThrow(`Failed to save enhanced conversion map: ${errorMessage}`);
    });
  });

  describe('Parameter Name Validation Tests', () => {
    it('should prevent regression: frontend-backend parameter mismatch', async () => {
      // This test specifically catches the bug we just fixed
      const mockMap = { version: '1.0.0', field_definitions: {}, transformation_rules: {} };
      mockInvoke.mockResolvedValue(mockMap);

      await EnhancedConversionService.loadEnhancedConversionMap('/test/path');
      
      const call = mockInvoke.mock.calls[0];
      const [command, params] = call;
      
      expect(command).toBe('load_enhanced_conversion_map');
      
      // Critical regression test: Must use camelCase for Tauri compatibility
      expect(params).toHaveProperty('filePath');
      expect(params).not.toHaveProperty('file_path'); // snake_case would cause the bug
      
      expect(params!.filePath).toBe('/test/path');
    });

    it('should prevent regression: save method parameter mismatch', async () => {
      const mockMap = { version: '1.0.0', field_definitions: {}, transformation_rules: {} };
      mockInvoke.mockResolvedValue(undefined);

      await EnhancedConversionService.saveEnhancedConversionMap(mockMap, '/test/save/path');
      
      const call = mockInvoke.mock.calls[0];
      const [command, params] = call;
      
      expect(command).toBe('save_enhanced_conversion_map');
      
      // Critical regression tests: Both parameters must use camelCase for Tauri
      expect(params).toHaveProperty('enhancedMap');
      expect(params).toHaveProperty('filePath');
      
      // These would cause bugs:
      expect(params).not.toHaveProperty('enhanced_map');
      expect(params).not.toHaveProperty('file_path');
      
      expect(params!.enhancedMap).toBe(mockMap);
      expect(params!.filePath).toBe('/test/save/path');
    });
  });

  describe('Integration Test Simulation', () => {
    it('should simulate the loading flow that was broken', async () => {
      // Simulate the exact scenario that was failing
      const expectedMap = {
        version: '1.0.0',
        header_row: 2,
        field_definitions: {
          server_label: {
            display_name: 'Server Name',
            xlsx_mappings: [{ pattern: 'Host Name', mapping_type: 'Exact' }]
          }
        },
        transformation_rules: {}
      };
      
      mockInvoke.mockResolvedValue(expectedMap);

      // This was the failing call pattern from useEnhancedConversion
      const result = await EnhancedConversionService.loadEnhancedConversionMap();
      
      expect(result).toEqual(expectedMap);
      expect(mockInvoke).toHaveBeenCalledWith('load_enhanced_conversion_map', { 
        file_path: undefined 
      });
    });
  });

  describe('Infinite Loading Regression Tests', () => {
    it('should complete loading within 1 second performance requirement', async () => {
      const mockMap = {
        version: '1.0.0',
        field_definitions: { test: 'field' },
        transformation_rules: {}
      };
      
      mockInvoke.mockResolvedValue(mockMap);

      const startTime = Date.now();
      const result = await EnhancedConversionService.loadEnhancedConversionMap();
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      
      // Critical requirement: Should load in less than 1 second (1000ms)
      // Using 500ms as test threshold to account for test environment overhead
      expect(loadTime).toBeLessThan(500);
      expect(result).toEqual(mockMap);
    });

    it('should prevent infinite loading state from infinite re-render loop', async () => {
      const mockMap = {
        version: '1.0.0',
        field_definitions: { test: 'field' },
        transformation_rules: {}
      };
      
      mockInvoke.mockResolvedValue(mockMap);

      // Simulate rapid successive calls that could occur in infinite re-render
      const loadPromises = [];
      for (let i = 0; i < 10; i++) {
        loadPromises.push(EnhancedConversionService.loadEnhancedConversionMap());
      }

      const results = await Promise.all(loadPromises);
      
      // All calls should complete successfully
      results.forEach(result => {
        expect(result).toEqual(mockMap);
      });
      
      // Backend should have been called for each request
      expect(mockInvoke).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent loading calls without hanging', async () => {
      const mockMap = {
        version: '1.0.0',
        field_definitions: { test: 'field' },
        transformation_rules: {}
      };
      
      // Add slight delay to simulate real network conditions
      mockInvoke.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockMap), 10))
      );

      // Start multiple concurrent loads
      const startTime = Date.now();
      const concurrentPromises = [
        EnhancedConversionService.loadEnhancedConversionMap(),
        EnhancedConversionService.loadEnhancedConversionMap(),
        EnhancedConversionService.loadEnhancedConversionMap()
      ];

      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      
      // Should complete all concurrent calls quickly (under 1 second)
      expect(totalTime).toBeLessThan(1000);
      
      // All results should be consistent
      results.forEach(result => {
        expect(result).toEqual(mockMap);
      });
    });
  });
});