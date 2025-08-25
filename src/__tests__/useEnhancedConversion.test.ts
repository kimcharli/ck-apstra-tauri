import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEnhancedConversion } from '../hooks/useEnhancedConversion';
import { EnhancedConversionService } from '../services/EnhancedConversionService';

// Mock Tauri's invoke function
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

// Mock the EnhancedConversionService
vi.mock('../services/EnhancedConversionService', () => ({
  EnhancedConversionService: {
    loadEnhancedConversionMap: vi.fn(),
    saveEnhancedConversionMap: vi.fn(),
    updateFieldDefinition: vi.fn(),
    removeFieldDefinition: vi.fn(),
    getFieldDefinition: vi.fn(),
    applyFieldTransformations: vi.fn(),
    validateFieldValues: vi.fn(),
    generateTableColumns: vi.fn(),
    migrateSimpleToEnhanced: vi.fn(),
    convertHeadersEnhanced: vi.fn(),
  }
}));

const mockEnhancedConversionService = vi.mocked(EnhancedConversionService);

describe('useEnhancedConversion Hook', () => {
  const mockEnhancedMap = {
    version: '1.0.0',
    header_row: 2,
    field_definitions: {
      test_field: {
        display_name: 'Test Field',
        description: 'Test field description',
        data_type: 'String' as const,
        is_required: true,
        is_key_field: false,
        xlsx_mappings: [],
        api_mappings: [],
        validation_rules: {},
        ui_config: {
          column_width: 120,
          sortable: true,
          filterable: true,
          hidden: false
        }
      }
    },
    transformation_rules: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Infinite Re-render Prevention Tests', () => {
    it('should not cause infinite re-renders when loadMap is called multiple times', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
      
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      // Track how many times loadMap is called
      let loadMapCallCount = 0;
      const originalLoadMap = result.current.loadMap;
      
      // Call loadMap multiple times in succession (simulating component re-renders)
      await act(async () => {
        const promises = [
          originalLoadMap(),
          originalLoadMap(),
          originalLoadMap()
        ];
        loadMapCallCount = promises.length;
        await Promise.all(promises);
      });

      // Should not cause excessive API calls due to re-renders
      expect(mockEnhancedConversionService.loadEnhancedConversionMap).toHaveBeenCalledTimes(3);
      expect(loadMapCallCount).toBe(3);
      
      // Final state should be loaded successfully
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
      expect(result.current.state.error).toBeNull();
    });

    it('should have stable loadMap function reference between renders', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
      
      const { result, rerender } = renderHook(
        (props) => useEnhancedConversion(props),
        { initialProps: { autoLoad: false } }
      );

      const firstLoadMapRef = result.current.loadMap;
      
      // Trigger re-render
      rerender({ autoLoad: false });
      
      const secondLoadMapRef = result.current.loadMap;
      
      // Function reference should be stable (same function object)
      expect(firstLoadMapRef).toBe(secondLoadMapRef);
    });

    it('should not recreate loadMap when state changes', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
      
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      const initialLoadMapRef = result.current.loadMap;
      
      // Load map to change state
      await act(async () => {
        await result.current.loadMap();
      });

      const afterLoadMapRef = result.current.loadMap;
      
      // Function reference should remain stable even after state changes
      expect(initialLoadMapRef).toBe(afterLoadMapRef);
    });

    it('should only recreate loadMap when conversionMapPath changes', () => {
      const { result, rerender } = renderHook(
        (props) => useEnhancedConversion(props),
        { initialProps: { autoLoad: false, conversionMapPath: 'path1' } }
      );

      const firstLoadMapRef = result.current.loadMap;
      
      // Rerender with same conversionMapPath
      rerender({ autoLoad: false, conversionMapPath: 'path1' });
      expect(result.current.loadMap).toBe(firstLoadMapRef);
      
      // Rerender with different conversionMapPath
      rerender({ autoLoad: false, conversionMapPath: 'path2' });
      expect(result.current.loadMap).not.toBe(firstLoadMapRef);
    });
  });

  describe('Loading State Management', () => {
    it('should handle loading state correctly without getting stuck', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
      
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.enhancedMap).toBeNull();

      // Start loading
      const loadPromise = act(async () => {
        await result.current.loadMap();
      });

      // Should complete loading
      await loadPromise;

      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
    });

    it('should reset loading state after error', async () => {
      const errorMessage = 'Load failed';
      mockEnhancedConversionService.loadEnhancedConversionMap.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      await act(async () => {
        try {
          await result.current.loadMap();
        } catch (error) {
          // Expected to throw
        }
      });

      // Loading should be false even after error
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBe(errorMessage);
    });

    it('should handle concurrent load calls without state corruption', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
      
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      // Start multiple concurrent loads
      const promises = [
        result.current.loadMap(),
        result.current.loadMap(),
        result.current.loadMap()
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      // Final state should be consistent
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Auto-load Prevention', () => {
    it('should not auto-load when autoLoad is false', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
      
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      // Wait a bit to ensure no auto-loading happens
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(mockEnhancedConversionService.loadEnhancedConversionMap).not.toHaveBeenCalled();
      expect(result.current.state.enhancedMap).toBeNull();
    });

    it('should auto-load when autoLoad is true', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
      
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: true }));

      await waitFor(() => {
        expect(result.current.state.enhancedMap).not.toBeNull();
      });

      expect(mockEnhancedConversionService.loadEnhancedConversionMap).toHaveBeenCalledTimes(1);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
    });

    it('should not auto-load multiple times when autoLoad is true', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
      
      const { result, rerender } = renderHook(
        (props) => useEnhancedConversion(props),
        { initialProps: { autoLoad: true } }
      );

      await waitFor(() => {
        expect(result.current.state.enhancedMap).not.toBeNull();
      });

      const callCount = mockEnhancedConversionService.loadEnhancedConversionMap.mock.calls.length;

      // Trigger re-render
      rerender({ autoLoad: true });
      
      // Should not call load again
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(mockEnhancedConversionService.loadEnhancedConversionMap).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('Performance Tests', () => {
    it('should complete loading within reasonable time', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
      
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      const startTime = Date.now();
      
      await act(async () => {
        await result.current.loadMap();
      });

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should complete within 100ms (well under 1 second requirement)
      expect(loadTime).toBeLessThan(100);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
    });
  });
});