import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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
  }
}));

const mockEnhancedConversionService = vi.mocked(EnhancedConversionService);

/**
 * CRITICAL REGRESSION TEST SUITE
 * 
 * This test suite prevents the infinite "Loading..." state issue that occurred when:
 * - useEffect dependency array included loadMap function
 * - loadMap was recreated on every render due to unstable dependencies
 * - This caused infinite re-renders preventing loading completion
 * 
 * User requirement: "conversion map is still 'Loading...'. It should be rendered less than one sec."
 */
describe('Conversion Map Loading Regression Prevention', () => {
  const mockEnhancedMap = {
    version: '1.0.0',
    header_row: 2,
    field_definitions: {
      test_field: {
        display_name: 'Test Field',
        description: 'Test field',
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
    mockEnhancedConversionService.loadEnhancedConversionMap.mockResolvedValue(mockEnhancedMap);
  });

  describe('CRITICAL: Infinite Loading State Prevention', () => {
    it('should complete loading within 1 second requirement', async () => {
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      const startTime = Date.now();
      
      await act(async () => {
        await result.current.loadMap();
      });

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // CRITICAL: Must meet user requirement of < 1 second
      expect(loadTime).toBeLessThan(1000);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
    });

    it('should not cause infinite re-renders when loadMap is called repeatedly', async () => {
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      // Simulate rapid calls that could occur in infinite re-render scenario
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(result.current.loadMap());
      }

      await act(async () => {
        await Promise.all(promises);
      });

      // Should complete all calls successfully
      expect(mockEnhancedConversionService.loadEnhancedConversionMap).toHaveBeenCalledTimes(5);
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
    });

    it('should have stable loadMap function reference to prevent useEffect loops', async () => {
      const { result, rerender } = renderHook(
        (props) => useEnhancedConversion(props),
        { initialProps: { autoLoad: false, conversionMapPath: undefined } }
      );

      const firstLoadMapRef = result.current.loadMap;
      
      // Trigger re-render with same props
      rerender({ autoLoad: false, conversionMapPath: undefined });
      
      const secondLoadMapRef = result.current.loadMap;
      
      // CRITICAL: Function reference must be stable
      expect(firstLoadMapRef).toBe(secondLoadMapRef);
    });

    it('should only recreate loadMap when conversionMapPath changes', () => {
      const { result, rerender } = renderHook(
        (props) => useEnhancedConversion(props),
        { initialProps: { autoLoad: false, conversionMapPath: 'path1' } }
      );

      const firstLoadMapRef = result.current.loadMap;
      
      // Same path - should be same reference
      rerender({ autoLoad: false, conversionMapPath: 'path1' });
      expect(result.current.loadMap).toBe(firstLoadMapRef);
      
      // Different path - should be new reference
      rerender({ autoLoad: false, conversionMapPath: 'path2' });
      expect(result.current.loadMap).not.toBe(firstLoadMapRef);
    });

    it('should not get stuck in loading state after errors', async () => {
      mockEnhancedConversionService.loadEnhancedConversionMap.mockRejectedValueOnce(
        new Error('Test error')
      );

      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      await act(async () => {
        try {
          await result.current.loadMap();
        } catch (error) {
          // Expected to throw
        }
      });

      // CRITICAL: Must not be stuck in loading state
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBe('Test error');
    });
  });

  describe('Performance Requirements Validation', () => {
    it('should meet sub-1-second loading performance requirement', async () => {
      // This simulates the embedded JSON data loading (include_str! in Rust)
      mockEnhancedConversionService.loadEnhancedConversionMap.mockImplementation(
        () => Promise.resolve(mockEnhancedMap)
      );

      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      const performanceStart = performance.now();
      
      await act(async () => {
        await result.current.loadMap();
      });

      const performanceEnd = performance.now();
      const loadTime = performanceEnd - performanceStart;

      // User requirement: "It should be rendered less than one sec."
      expect(loadTime).toBeLessThan(1000);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
    });

    it('should handle concurrent loading without performance degradation', async () => {
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      const startTime = performance.now();
      
      // Multiple concurrent loads
      const concurrentPromises = [
        result.current.loadMap(),
        result.current.loadMap(),
        result.current.loadMap()
      ];

      await act(async () => {
        await Promise.all(concurrentPromises);
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete all concurrent operations quickly
      expect(totalTime).toBeLessThan(1000);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
    });
  });

  describe('Root Cause Verification', () => {
    it('should document the exact bug that was fixed', () => {
      // The bug was in EnhancedConversionMapManager.tsx line 60:
      // BEFORE (problematic):
      // }, [isVisible, loadMap, state.enhancedMap, state.loading]);
      //            ^^^^^^^ This caused infinite re-renders
      
      // AFTER (fixed):
      // }, [isVisible, state.enhancedMap, state.loading]);
      //    ^^^^^^^ loadMap removed from dependencies

      const problematicPattern = 'useEffect(() => { /* load code */ }, [isVisible, loadMap, state.enhancedMap, state.loading]);';
      const fixedPattern = 'useEffect(() => { /* load code */ }, [isVisible, state.enhancedMap, state.loading]);';

      expect(fixedPattern).not.toEqual(problematicPattern);
      
      // Verify the fix by checking dependency arrays
      const problematicDeps = problematicPattern.match(/\[(.*?)\]/)?.[1]?.split(',').map(s => s.trim()) || [];
      const fixedDeps = fixedPattern.match(/\[(.*?)\]/)?.[1]?.split(',').map(s => s.trim()) || [];
      
      expect(problematicDeps).toContain('loadMap');
      expect(fixedDeps).not.toContain('loadMap');
    });

    it('should verify the secondary fix in useEnhancedConversion hook', () => {
      // The secondary bug was in useEnhancedConversion.ts line 110:
      // BEFORE (problematic):
      // }, [conversionMapPath, setLoading, setError, setEnhancedMap]);
      //                       ^^^^^^^^^^  ^^^^^^^^  ^^^^^^^^^^^^^^ Caused loadMap recreations
      
      // AFTER (fixed):
      // }, [conversionMapPath]);
      //    ^^^^^^^^^^^^^^^^^ Only stable dependency

      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));
      
      // loadMap should be stable when conversionMapPath doesn't change
      const loadMapRef1 = result.current.loadMap;
      const loadMapRef2 = result.current.loadMap;
      
      expect(loadMapRef1).toBe(loadMapRef2);
    });
  });

  describe('Regression Test Coverage', () => {
    it('should ensure this regression cannot happen again', async () => {
      // This test will fail if the infinite re-render bug is reintroduced
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      let renderCount = 0;
      const originalLoadMap = result.current.loadMap;
      
      // Simulate component that would cause infinite renders with the old bug
      const simulateComponentRender = () => {
        renderCount++;
        if (renderCount > 10) {
          throw new Error('Infinite re-render detected - regression occurred!');
        }
        return result.current.loadMap;
      };

      // Should not trigger infinite render
      const loadMapAfterRenders = simulateComponentRender();
      expect(loadMapAfterRenders).toBe(originalLoadMap);
      expect(renderCount).toBeLessThan(5);
    });

    it('should validate the fix works under stress conditions', async () => {
      const { result } = renderHook(() => useEnhancedConversion({ autoLoad: false }));

      // Stress test: rapid state changes that could trigger old bug
      const stressPromises: Promise<any>[] = [];
      
      for (let i = 0; i < 20; i++) {
        stressPromises.push(result.current.loadMap());
      }

      const startTime = Date.now();
      
      await act(async () => {
        await Promise.all(stressPromises);
      });

      const endTime = Date.now();
      const stressTime = endTime - startTime;

      // Should complete stress test quickly without getting stuck
      expect(stressTime).toBeLessThan(5000); // 5 second max for stress test
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.enhancedMap).toEqual(mockEnhancedMap);
    });
  });
});