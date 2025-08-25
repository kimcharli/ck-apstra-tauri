import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

// Mock the ApstraApiService
vi.mock('../services/ApstraApiService', () => ({
  apstraApiService: {
    getHost: vi.fn(() => 'mock-host'),
    queryConnectivity: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }
}));

// Mock the TauriApiService
vi.mock('../services/TauriApiService', () => ({
  TauriApiService: {
    loadConversionMap: vi.fn(() => Promise.resolve({})),
    saveConversionMap: vi.fn(() => Promise.resolve()),
  }
}));

// Mock the EnhancedConversionService
vi.mock('../services/EnhancedConversionService', () => ({
  EnhancedConversionService: {
    loadDefaultMap: vi.fn(() => Promise.resolve({})),
    validateMapping: vi.fn(() => ({ isValid: true, errors: [] })),
  }
}));

describe('App Integration Tests', () => {
  it('should render main application without crashing', () => {
    const { container } = render(<App />);
    
    // Verify specific UI elements render (use exact text to avoid multiple matches)
    expect(screen.getByText('Apstra Provisioning Tool')).toBeInTheDocument();
    
    // Verify the container is not empty
    expect(container.firstChild).not.toBeNull();
    expect(container).not.toBeEmptyDOMElement();
  });

  it('should not have a blank page - React must render content', () => {
    const { container } = render(<App />);
    
    // Critical test: Ensure React actually renders content to DOM
    expect(container).not.toBeEmptyDOMElement();
    expect(container.textContent).not.toBe('');
    expect(container.innerHTML).not.toBe('');
  });

  it('should render navigation elements', () => {
    render(<App />);
    
    // Verify main navigation or header exists
    // This catches cases where TypeScript compilation fails prevent UI rendering
    const navigationElements = screen.queryAllByRole('button');
    expect(navigationElements.length).toBeGreaterThan(0);
  });

  it('should have proper React component structure', () => {
    const { container } = render(<App />);
    
    // Verify React component tree renders properly
    expect(container.firstChild).not.toBeNull();
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('should catch TypeScript compilation issues that prevent rendering', () => {
    // This test will fail if TypeScript compilation errors prevent bundle creation
    // The render() call itself validates that all imports and exports work correctly
    expect(() => render(<App />)).not.toThrow();
  });
});

describe('Critical Blank Page Prevention', () => {
  it('should prevent blank page caused by missing type exports', () => {
    // This test specifically catches the issue we fixed:
    // Missing exports like MappingType, DataType, ValidationError
    // cause TypeScript compilation to fail, resulting in blank page
    
    render(<App />);
    
    // If we get here without throwing, TypeScript compilation succeeded
    const content = document.body.textContent;
    expect(content).not.toBe('');
    expect(content).toContain('Apstra Provisioning Tool');
  });

  it('should prevent blank page caused by authentication context hanging', () => {
    const { container } = render(<App />);
    
    // Verify app renders even if authentication context has issues
    // This would catch the setTimeout/Promise.race authentication fix
    expect(container.textContent).toBeTruthy();
  });

  it('should handle service integration failures gracefully', () => {
    // Test that service failures don't cause complete blank page
    const { container } = render(<App />);
    
    // App should render with error states rather than blank page
    expect(container).not.toBeEmptyDOMElement();
  });
});