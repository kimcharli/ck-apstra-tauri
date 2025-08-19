/**
 * Integration tests for ConversionMapManager UI functionality
 * Tests the conversion map user interface, mapping changes, and data flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConversionMap, HeaderMapping } from '../../src/types';
import ConversionMapManager from '../../src/components/ConversionMapManager/ConversionMapManager';

// Mock Tauri API
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockInvoke,
}));

// Mock dialog API
vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe('ConversionMapManager Integration Tests', () => {
  const mockConversionMap: ConversionMap = {
    header_row: 2,
    mappings: {
      'Switch Name': 'switch_label',
      'Port': 'switch_ifname',
      'Host Name': 'server_label',
      'Slot/Port': 'server_ifname',
      'Speed\n(GB)': 'link_speed',
      'External': 'is_external',
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(mockConversionMap);
  });

  it('should load and display conversion mappings correctly', async () => {
    const mockOnConversionMapChange = vi.fn();
    const mockOnNavigate = vi.fn();

    render(
      <ConversionMapManager
        isVisible={true}
        onConversionMapChange={mockOnConversionMapChange}
        onNavigate={mockOnNavigate}
      />
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('load_user_conversion_map');
    });

    // Check that mappings are displayed with correct target field labels
    await waitFor(() => {
      expect(screen.getByText('Switch Name')).toBeInTheDocument();
      expect(screen.getByText('Host Name')).toBeInTheDocument();
      expect(screen.getByText('Slot/Port')).toBeInTheDocument();
    });

    // Verify that dropdowns show proper field labels instead of "switch"
    const dropdowns = screen.getAllByRole('combobox');
    expect(dropdowns.length).toBeGreaterThan(0);
    
    // Check that available field options are present
    fireEvent.click(dropdowns[0]);
    await waitFor(() => {
      expect(screen.getByText('Switch Name')).toBeInTheDocument();
      expect(screen.getByText('Server Name/Host Name')).toBeInTheDocument();
      expect(screen.getByText('Server Interface/Slot/Port')).toBeInTheDocument();
    });
  });

  it('should handle adding new mappings', async () => {
    const mockOnConversionMapChange = vi.fn();

    render(
      <ConversionMapManager
        isVisible={true}
        onConversionMapChange={mockOnConversionMapChange}
      />
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('load_user_conversion_map');
    });

    // Find the add mapping controls
    const excelHeaderInput = screen.getByPlaceholderText('Excel Header');
    const targetFieldSelect = screen.getByDisplayValue('Select Target Field');
    const addButton = screen.getByText('Add');

    // Add a new mapping
    fireEvent.change(excelHeaderInput, { target: { value: 'Test Header' } });
    fireEvent.change(targetFieldSelect, { target: { value: 'server_tags' } });
    fireEvent.click(addButton);

    // Verify the new mapping appears in the UI
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Header')).toBeInTheDocument();
    });
  });

  it('should save user conversion map with correct structure', async () => {
    const mockOnConversionMapChange = vi.fn();
    mockInvoke.mockResolvedValueOnce(mockConversionMap);
    mockInvoke.mockResolvedValueOnce(undefined); // for save operation

    render(
      <ConversionMapManager
        isVisible={true}
        onConversionMapChange={mockOnConversionMapChange}
      />
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('load_user_conversion_map');
    });

    // Click save button
    const saveButton = screen.getByText('Save User Map');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('save_user_conversion_map', {
        conversionMap: {
          header_row: 2,
          mappings: {
            'Switch Name': 'switch_label',
            'Port': 'switch_ifname',
            'Host Name': 'server_label',
            'Slot/Port': 'server_ifname',
            'Speed\n(GB)': 'link_speed',
            'External': 'is_external',
          }
        }
      });
    });

    expect(mockOnConversionMapChange).toHaveBeenCalledWith({
      header_row: 2,
      mappings: {
        'Switch Name': 'switch_label',
        'Port': 'switch_ifname',
        'Host Name': 'server_label',
        'Slot/Port': 'server_ifname',
        'Speed\n(GB)': 'link_speed',
        'External': 'is_external',
      }
    });
  });

  it('should handle field mapping updates correctly', async () => {
    render(
      <ConversionMapManager
        isVisible={true}
      />
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('load_user_conversion_map');
    });

    // Find a mapping dropdown and change it
    const dropdowns = screen.getAllByRole('combobox');
    if (dropdowns.length > 0) {
      const firstDropdown = dropdowns[0];
      
      // Change the mapping
      fireEvent.change(firstDropdown, { target: { value: 'server_tags' } });

      // Verify the change is reflected
      expect(firstDropdown).toHaveValue('server_tags');
    }
  });

  it('should load default conversion map', async () => {
    const mockDefaultMap: ConversionMap = {
      header_row: 2,
      mappings: {
        'Switch Name': 'switch_label',
        'Host Name': 'server_label',
        // Default mappings from fixture
      }
    };

    mockInvoke.mockResolvedValueOnce(mockConversionMap);
    mockInvoke.mockResolvedValueOnce(mockDefaultMap);

    render(
      <ConversionMapManager
        isVisible={true}
      />
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('load_user_conversion_map');
    });

    // Click load default button
    const loadDefaultButton = screen.getByText('Load Default');
    fireEvent.click(loadDefaultButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('load_default_conversion_map');
    });
  });

  it('should validate field mapping consistency', async () => {
    const inconsistentMap: ConversionMap = {
      header_row: 2,
      mappings: {
        'Host Name': 'server_label',
        'Slot/Port': 'server_ifname',
        // These should map to proper internal field names
      }
    };

    mockInvoke.mockResolvedValueOnce(inconsistentMap);

    render(
      <ConversionMapManager
        isVisible={true}
      />
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('load_user_conversion_map');
    });

    // Verify that the target field mappings are displayed with proper labels
    // This tests the fix for showing "switch" for all mappings
    const dropdowns = screen.getAllByRole('combobox');
    
    for (const dropdown of dropdowns) {
      // Check that no dropdown shows just "switch" as the only option
      fireEvent.click(dropdown);
      
      await waitFor(() => {
        // Should have multiple distinct options
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(1);
        
        // Should not have all options showing "switch"
        const switchOptions = options.filter(opt => opt.textContent === 'switch');
        expect(switchOptions.length).toBeLessThan(options.length);
      });
    }
  });

  it('should handle blueprint mapping removal', async () => {
    const mapWithBlueprint: ConversionMap = {
      header_row: 2,
      mappings: {
        'Blueprint': 'blueprint', // This should not be allowed
        'Switch Name': 'switch_label',
        'Host Name': 'server_label',
      }
    };

    mockInvoke.mockResolvedValueOnce(mapWithBlueprint);

    render(
      <ConversionMapManager
        isVisible={true}
      />
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('load_user_conversion_map');
    });

    // Blueprint mapping should not appear in available fields
    const targetFieldDropdowns = screen.getAllByRole('combobox');
    
    for (const dropdown of targetFieldDropdowns) {
      fireEvent.click(dropdown);
      
      await waitFor(() => {
        // Blueprint should not be an available option
        expect(screen.queryByText('Blueprint')).not.toBeInTheDocument();
      });
    }
  });

  it('should display correct field labels in dropdowns', async () => {
    render(
      <ConversionMapManager
        isVisible={true}
      />
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('load_user_conversion_map');
    });

    // Test that the availableFields array shows proper labels
    const expectedFields = [
      { value: 'switch_label', label: 'Switch Name' },
      { value: 'server_label', label: 'Server Name/Host Name' },
      { value: 'server_ifname', label: 'Server Interface/Slot/Port' },
      { value: 'link_speed', label: 'Link Speed' },
      { value: 'is_external', label: 'External Flag' },
    ];

    // Find add mapping dropdown
    const addMappingSelect = screen.getByDisplayValue('Select Target Field');
    fireEvent.click(addMappingSelect);

    await waitFor(() => {
      for (const field of expectedFields) {
        expect(screen.getByText(field.label)).toBeInTheDocument();
      }
    });
  });
});

/**
 * Test helper functions for conversion map testing
 */
export const ConversionMapTestHelpers = {
  createMockConversionMap: (overrides?: Partial<ConversionMap>): ConversionMap => ({
    header_row: 2,
    mappings: {
      'Switch Name': 'switch_label',
      'Port': 'switch_ifname', 
      'Host Name': 'server_label',
      'Slot/Port': 'server_ifname',
      ...overrides?.mappings,
    },
    ...overrides,
  }),

  expectMappingInUI: async (excelHeader: string, expectedTargetField: string) => {
    const headerInput = screen.getByDisplayValue(excelHeader);
    expect(headerInput).toBeInTheDocument();
    
    // Find the corresponding dropdown
    const row = headerInput.closest('.mapping-item');
    const dropdown = row?.querySelector('select');
    expect(dropdown).toHaveValue(expectedTargetField);
  },

  expectFieldLabelsInDropdown: async (dropdown: HTMLElement, expectedLabels: string[]) => {
    fireEvent.click(dropdown);
    
    await waitFor(() => {
      for (const label of expectedLabels) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });
  },
};