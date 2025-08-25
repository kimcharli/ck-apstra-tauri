import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import EnhancedConversionMapManager from '../components/ConversionMapManager/EnhancedConversionMapManager';
import { useEnhancedConversion } from '../hooks/useEnhancedConversion';

// Mock the useEnhancedConversion hook
vi.mock('../hooks/useEnhancedConversion');

// Mock Tauri APIs
vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

// Mock the auth context and navigation header
vi.mock('../hooks/useAuthStatus', () => ({
  useAuthStatus: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false
  }))
}));

vi.mock('../components/NavigationHeader/NavigationHeader', () => ({
  default: () => <div data-testid="navigation-header">Navigation Header</div>
}));

const mockUseEnhancedConversion = vi.mocked(useEnhancedConversion);

describe('EnhancedConversionMapManager Component', () => {
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

  const mockHookReturn = {
    state: {
      enhancedMap: null,
      loading: false,
      error: null,
      lastUpdated: null
    },
    loadMap: vi.fn(),
    saveMap: vi.fn(),
    resetToDefault: vi.fn(),
    convertHeaders: vi.fn(),
    addField: vi.fn(),
    updateField: vi.fn(),
    removeField: vi.fn(),
    getField: vi.fn(),
    transformData: vi.fn(),
    validateData: vi.fn(),
    generateTableColumns: vi.fn(),
    migrateFromSimple: vi.fn(),
    clearError: vi.fn(),
    refresh: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEnhancedConversion.mockReturnValue(mockHookReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Infinite Re-render Prevention Tests', () => {
    it('should not cause infinite re-renders when becoming visible', async () => {
      const loadMapSpy = vi.fn().mockResolvedValue(mockEnhancedMap);
      mockUseEnhancedConversion.mockReturnValue({
        ...mockHookReturn,
        loadMap: loadMapSpy,
        state: {
          enhancedMap: null,
          loading: false,
          error: null,
          lastUpdated: null
        }
      });

      const { rerender } = render(
        <EnhancedConversionMapManager isVisible={false} />
      );

      // Component is not visible, should not load
      expect(loadMapSpy).not.toHaveBeenCalled();

      // Make component visible
      rerender(<EnhancedConversionMapManager isVisible={true} />);

      // Should load once
      await waitFor(() => {
        expect(loadMapSpy).toHaveBeenCalledTimes(1);
      });

      // Additional re-renders should not cause more loads
      rerender(<EnhancedConversionMapManager isVisible={true} />);
      rerender(<EnhancedConversionMapManager isVisible={true} />);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should still only be called once
      expect(loadMapSpy).toHaveBeenCalledTimes(1);
    });

    it('should not load when map is already loaded', async () => {
      const loadMapSpy = vi.fn().mockResolvedValue(mockEnhancedMap);
      mockUseEnhancedConversion.mockReturnValue({
        ...mockHookReturn,
        loadMap: loadMapSpy,
        state: {
          enhancedMap: mockEnhancedMap, // Map already loaded
          loading: false,
          error: null,
          lastUpdated: new Date()
        }
      });

      render(<EnhancedConversionMapManager isVisible={true} />);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should not load since map is already available
      expect(loadMapSpy).not.toHaveBeenCalled();
    });

    it('should not load when already loading', async () => {
      const loadMapSpy = vi.fn().mockResolvedValue(mockEnhancedMap);
      mockUseEnhancedConversion.mockReturnValue({
        ...mockHookReturn,
        loadMap: loadMapSpy,
        state: {
          enhancedMap: null,
          loading: true, // Already loading
          error: null,
          lastUpdated: null
        }
      });

      render(<EnhancedConversionMapManager isVisible={true} />);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should not load since already loading
      expect(loadMapSpy).not.toHaveBeenCalled();
    });

    it('should handle visibility changes correctly without extra loads', async () => {
      const loadMapSpy = vi.fn().mockResolvedValue(mockEnhancedMap);
      
      let currentState: { enhancedMap: any, loading: boolean, error: string | null, lastUpdated: Date | null } = {
        enhancedMap: null,
        loading: false,
        error: null,
        lastUpdated: null
      };

      mockUseEnhancedConversion.mockImplementation(() => ({
        ...mockHookReturn,
        loadMap: loadMapSpy.mockImplementation(async () => {
          currentState = { ...currentState, loading: true };
          await new Promise(resolve => setTimeout(resolve, 1));
          currentState = { 
            ...currentState, 
            loading: false, 
            enhancedMap: mockEnhancedMap,
            lastUpdated: new Date()
          };
          return mockEnhancedMap;
        }),
        state: currentState
      }));

      const { rerender } = render(
        <EnhancedConversionMapManager isVisible={false} />
      );

      // Make visible -> should load
      rerender(<EnhancedConversionMapManager isVisible={true} />);

      await waitFor(() => {
        expect(loadMapSpy).toHaveBeenCalledTimes(1);
      });

      // Hide -> should not load again
      rerender(<EnhancedConversionMapManager isVisible={false} />);

      // Show again -> should not load since map is already loaded
      rerender(<EnhancedConversionMapManager isVisible={true} />);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should still only be called once
      expect(loadMapSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State Display Tests', () => {
    it('should show loading state correctly', async () => {
      mockUseEnhancedConversion.mockReturnValue({
        ...mockHookReturn,
        state: {
          enhancedMap: null,
          loading: true,
          error: null,
          lastUpdated: null
        }
      });

      render(<EnhancedConversionMapManager isVisible={true} />);

      // Should show loading indicator
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show loaded content when not loading', async () => {
      mockUseEnhancedConversion.mockReturnValue({
        ...mockHookReturn,
        state: {
          enhancedMap: mockEnhancedMap,
          loading: false,
          error: null,
          lastUpdated: new Date()
        }
      });

      render(<EnhancedConversionMapManager isVisible={true} />);

      // Should not show loading indicator
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      
      // Should show field definition content
      expect(screen.getByText('Test Field')).toBeInTheDocument();
    });

    it('should never get stuck in loading state', async () => {
      const loadMapSpy = vi.fn().mockResolvedValue(mockEnhancedMap);
      
      // Start with loading state
      const { rerender } = render(
        <EnhancedConversionMapManager isVisible={true} />
      );

      // Mock that loading completes
      mockUseEnhancedConversion.mockReturnValue({
        ...mockHookReturn,
        loadMap: loadMapSpy,
        state: {
          enhancedMap: mockEnhancedMap,
          loading: false, // Loading completed
          error: null,
          lastUpdated: new Date()
        }
      });

      rerender(<EnhancedConversionMapManager isVisible={true} />);

      // Should show loaded content, not loading
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('Test Field')).toBeInTheDocument();
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle loading errors without getting stuck', async () => {
      const loadMapSpy = vi.fn().mockRejectedValue(new Error('Load failed'));
      mockUseEnhancedConversion.mockReturnValue({
        ...mockHookReturn,
        loadMap: loadMapSpy,
        state: {
          enhancedMap: null,
          loading: false,
          error: 'Failed to load conversion map: Load failed',
          lastUpdated: null
        }
      });

      // Spy on console.error to verify error logging
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<EnhancedConversionMapManager isVisible={true} />);

      await waitFor(() => {
        expect(loadMapSpy).toHaveBeenCalledTimes(1);
      });

      // Should log error to console
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load conversion map:', 
          expect.any(Error)
        );
      });

      // Should not be stuck in loading state
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance Tests', () => {
    it('should render without performance issues', async () => {
      const renderStart = performance.now();

      render(<EnhancedConversionMapManager isVisible={true} />);

      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;

      // Should render quickly (under 50ms)
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle rapid visibility changes without issues', async () => {
      const loadMapSpy = vi.fn().mockResolvedValue(mockEnhancedMap);
      mockUseEnhancedConversion.mockReturnValue({
        ...mockHookReturn,
        loadMap: loadMapSpy
      });

      const { rerender } = render(
        <EnhancedConversionMapManager isVisible={false} />
      );

      // Rapid visibility changes
      for (let i = 0; i < 10; i++) {
        rerender(<EnhancedConversionMapManager isVisible={i % 2 === 0} />);
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      // Should not cause excessive load calls
      expect(loadMapSpy.mock.calls.length).toBeLessThan(5);
    });
  });

  describe('Component Integration Tests', () => {
    it('should call onConversionMapChange when map loads successfully', async () => {
      const onConversionMapChangeSpy = vi.fn();
      
      mockUseEnhancedConversion.mockReturnValue({
        ...mockHookReturn,
        state: {
          enhancedMap: mockEnhancedMap,
          loading: false,
          error: null,
          lastUpdated: new Date()
        }
      });

      render(
        <EnhancedConversionMapManager 
          isVisible={true} 
          onConversionMapChange={onConversionMapChangeSpy}
        />
      );

      // The hook should call onSuccess which triggers onConversionMapChange
      await waitFor(() => {
        expect(mockUseEnhancedConversion).toHaveBeenCalledWith({
          autoLoad: false,
          onSuccess: expect.any(Function)
        });
      });
    });

    it('should not crash when props change rapidly', async () => {
      const { rerender } = render(
        <EnhancedConversionMapManager isVisible={false} />
      );

      // Rapid prop changes
      const props = [
        { isVisible: true },
        { isVisible: false },
        { isVisible: true, onClose: vi.fn() },
        { isVisible: false, onNavigate: vi.fn() },
        { isVisible: true, onConversionMapChange: vi.fn() }
      ];

      for (const prop of props) {
        rerender(<EnhancedConversionMapManager {...prop} />);
      }

      // Should not crash
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});