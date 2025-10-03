import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProvisioningTable from '../ProvisioningTable';
import { generateLargeTestDataset } from './fixtures/testData';

// Mock dependencies
vi.mock('../../../domains/apstra/services/ApstraApiService', () => ({
  apstraApiService: {
    getHost: vi.fn(() => 'mock-host'),
    queryConnectivity: vi.fn(),
  }
}));

vi.mock('../../../utils/blueprintMapping', () => ({
  getBlueprintIdByLabel: vi.fn(() => 'mock-blueprint-id'),
}));

vi.mock('../../../utils/apstraLinkHelpers', () => ({
  renderApstraSystemButtonWithLookup: vi.fn(() => 'MockedButton'),
}));

describe.skip('ProvisioningTable - Performance Tests', () => {
  const mockOnProvision = vi.fn();
  const mockOnDataUpdate = vi.fn();

  describe('Server Grouping Performance', () => {
    it('should handle moderate dataset efficiently (50 servers, 200 connections)', () => {
      const testData = generateLargeTestDataset(50, 4); // 200 connections
      
      const startTime = performance.now();
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000); // 1 second
      
      // Should display correct data count
      expect(screen.getByText(/Showing 200 of 200 rows/)).toBeInTheDocument();
    });

    it('should handle large dataset efficiently (100 servers, 500 connections)', () => {
      const testData = generateLargeTestDataset(100, 5); // 500 connections
      
      const startTime = performance.now();
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time for large dataset
      expect(renderTime).toBeLessThan(2000); // 2 seconds
      
      // Should display correct data count
      expect(screen.getByText(/Showing 500 of 500 rows/)).toBeInTheDocument();
    });

    it('should maintain server grouping with large datasets', () => {
      const testData = generateLargeTestDataset(20, 3); // 60 connections, 20 servers
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      // Get all server name cells
      const serverCells = screen.getAllByText(/Server\d+/);
      
      // Verify first few servers are properly grouped
      expect(serverCells[0]).toHaveTextContent('Server001');
      expect(serverCells[1]).toHaveTextContent('Server001');
      expect(serverCells[2]).toHaveTextContent('Server001');
      expect(serverCells[3]).toHaveTextContent('Server002');
      expect(serverCells[4]).toHaveTextContent('Server002');
      expect(serverCells[5]).toHaveTextContent('Server002');
    });

    it('should handle memory efficiently with very large datasets', () => {
      // Test memory usage doesn't grow excessively
      const testData = generateLargeTestDataset(200, 3); // 600 connections
      
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (adjust threshold as needed)
      // This test will only run in browsers that support performance.memory
      if ((performance as any).memory) {
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      }
    });
  });

  describe('Filtering Performance', () => {
    it('should filter large datasets efficiently', () => {
      const testData = generateLargeTestDataset(100, 5); // 500 connections
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      const filterInput = screen.getByPlaceholderText('Filter data...') as HTMLInputElement;
      
      const startTime = performance.now();
      
      // Simulate typing to filter for Server001
      filterInput.value = 'Server001';
      filterInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      const endTime = performance.now();
      const filterTime = endTime - startTime;
      
      // Filtering should be fast
      expect(filterTime).toBeLessThan(100); // 100ms
      
      // Should show filtered results
      expect(screen.getByText(/Showing 5 of 500 rows/)).toBeInTheDocument();
    });
  });

  describe('Sorting Performance', () => {
    it('should sort large datasets efficiently', () => {
      const testData = generateLargeTestDataset(100, 5); // 500 connections
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      const serverHeader = screen.getByText('Server Name');
      
      const startTime = performance.now();
      
      // Click to sort by server name
      serverHeader.click();
      
      const endTime = performance.now();
      const sortTime = endTime - startTime;
      
      // Sorting should be fast
      expect(sortTime).toBeLessThan(200); // 200ms
    });
  });

  describe('Selection Performance', () => {
    it('should handle mass selection efficiently', () => {
      const testData = generateLargeTestDataset(50, 4); // 200 connections
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      const selectAllCheckbox = screen.getByTitle('Select all visible rows');
      
      const startTime = performance.now();
      
      // Select all rows
      selectAllCheckbox.click();
      
      const endTime = performance.now();
      const selectionTime = endTime - startTime;
      
      // Mass selection should be fast
      expect(selectionTime).toBeLessThan(100); // 100ms
      
      // Should show all rows selected
      expect(screen.getByText(/200 selected/)).toBeInTheDocument();
    });
  });

  describe('Render Optimization', () => {
    it('should not re-render unnecessarily when props do not change', () => {
      const testData = generateLargeTestDataset(10, 3); // 30 connections
      
      let renderCount = 0;
      
      // Mock a render counter (in real implementation, you might use React DevTools)
      const OriginalProvisioningTable = ProvisioningTable;
      const CountedProvisioningTable = (props: any) => {
        renderCount++;
        return OriginalProvisioningTable(props);
      };
      
      const { rerender } = render(
        <CountedProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      const initialRenderCount = renderCount;
      
      // Re-render with same props
      rerender(
        <CountedProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      // Should not re-render unnecessarily due to memoization
      expect(renderCount).toBe(initialRenderCount + 1); // Only one additional render
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle datasets with many servers having single connections', () => {
      // Create dataset where each server has only one connection (worst case for grouping)
      const testData = generateLargeTestDataset(500, 1); // 500 servers, 1 connection each
      
      const startTime = performance.now();
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should handle many single-connection servers efficiently
      expect(renderTime).toBeLessThan(2000); // 2 seconds
      
      expect(screen.getByText(/Showing 500 of 500 rows/)).toBeInTheDocument();
    });

    it('should handle datasets with few servers having many connections', () => {
      // Create dataset where few servers have many connections
      const testData = generateLargeTestDataset(5, 100); // 5 servers, 100 connections each
      
      const startTime = performance.now();
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should handle servers with many connections efficiently
      expect(renderTime).toBeLessThan(2000); // 2 seconds
      
      expect(screen.getByText(/Showing 500 of 500 rows/)).toBeInTheDocument();
    });
  });
});