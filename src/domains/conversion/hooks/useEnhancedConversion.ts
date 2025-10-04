import { useState, useEffect, useCallback } from 'react';
import { 
  EnhancedConversionService,
  EnhancedConversionMap,
  FieldDefinition,
  HeaderConversionResult,
  ValidationResult,
  TableColumnDefinition
} from '../services/EnhancedConversionService';

export interface UseEnhancedConversionOptions {
  autoLoad?: boolean;
  conversionMapPath?: string;
  onError?: (error: Error) => void;
  onSuccess?: (map: EnhancedConversionMap) => void;
}

export interface EnhancedConversionState {
  enhancedMap: EnhancedConversionMap | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UseEnhancedConversionReturn {
  // State
  state: EnhancedConversionState;
  
  // Core operations
  loadMap: (filePath?: string) => Promise<EnhancedConversionMap>;
  saveMap: (map: EnhancedConversionMap, filePath: string) => Promise<void>;
  resetToDefault: () => Promise<EnhancedConversionMap>;
  
  // Header conversion
  convertHeaders: (excelHeaders: string[]) => Promise<HeaderConversionResult | null>;
  
  // Field operations
  addField: (fieldName: string, definition: FieldDefinition) => Promise<EnhancedConversionMap>;
  updateField: (fieldName: string, definition: FieldDefinition) => Promise<EnhancedConversionMap>;
  removeField: (fieldName: string) => Promise<EnhancedConversionMap>;
  getField: (fieldName: string) => Promise<FieldDefinition | null>;
  
  // Data processing
  transformData: (data: Record<string, any>) => Promise<Record<string, any>>;
  validateData: (data: Record<string, any>) => Promise<ValidationResult>;
  
  // UI generation
  generateTableColumns: (context?: string) => Promise<TableColumnDefinition[]>;
  
  // Migration
  migrateFromSimple: (simpleMappings: Record<string, string>, headerRow?: number) => Promise<EnhancedConversionMap>;
  
  // Utilities
  clearError: () => void;
  refresh: () => Promise<void>;
}

export const useEnhancedConversion = (options: UseEnhancedConversionOptions = {}): UseEnhancedConversionReturn => {
  const {
    autoLoad = true,
    conversionMapPath,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<EnhancedConversionState>({
    enhancedMap: null,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
    if (error && onError) {
      onError(new Error(error));
    }
  }, [onError]);

  const setEnhancedMap = useCallback((map: EnhancedConversionMap | null) => {
    setState(prev => ({
      ...prev,
      enhancedMap: map,
      lastUpdated: map ? new Date() : null
    }));
    if (map && onSuccess) {
      onSuccess(map);
    }
  }, [onSuccess]);

  const loadMap = useCallback(async (filePath?: string): Promise<EnhancedConversionMap> => {
    try {
      setLoading(true);
      setError(null);
      
      const map = await EnhancedConversionService.loadEnhancedConversionMap(filePath || conversionMapPath);
      setEnhancedMap(map);
      return map;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversion map';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
    // CRITICAL: Only include stable dependencies in useCallback deps
    // Including state setters (setLoading, setError, setEnhancedMap) causes function recreation
    // which leads to infinite re-renders when used in useEffect dependency arrays
  }, [conversionMapPath]);

  const saveMap = useCallback(async (map: EnhancedConversionMap, filePath: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await EnhancedConversionService.saveEnhancedConversionMap(map, filePath);
      setEnhancedMap({ ...map, updated_at: new Date().toISOString() });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save conversion map';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []); // Fix infinite re-render: state setters are stable, don't include in deps

  const resetToDefault = useCallback(async (): Promise<EnhancedConversionMap> => {
    return await loadMap(); // Load without path defaults to built-in map
  }, [loadMap]);

  const convertHeaders = useCallback(async (excelHeaders: string[]): Promise<HeaderConversionResult | null> => {
    if (!state.enhancedMap) {
      setError('No conversion map loaded');
      return null;
    }

    try {
      const result = await EnhancedConversionService.convertHeadersEnhanced(excelHeaders, state.enhancedMap);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert headers';
      setError(errorMessage);
      return null;
    }
  }, [state.enhancedMap]); // Fix: setError is stable, don't include in deps

  const addField = useCallback(async (fieldName: string, definition: FieldDefinition): Promise<EnhancedConversionMap> => {
    if (!state.enhancedMap) {
      throw new Error('No conversion map loaded');
    }

    try {
      setLoading(true);
      const updatedMap = await EnhancedConversionService.updateFieldDefinition(
        state.enhancedMap,
        fieldName,
        definition
      );
      setEnhancedMap(updatedMap);
      return updatedMap;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add field';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [state.enhancedMap]); // Fix: only include state.enhancedMap, not setters

  const updateField = useCallback(async (fieldName: string, definition: FieldDefinition): Promise<EnhancedConversionMap> => {
    return await addField(fieldName, definition); // Same operation
  }, [addField]);

  const removeField = useCallback(async (fieldName: string): Promise<EnhancedConversionMap> => {
    if (!state.enhancedMap) {
      throw new Error('No conversion map loaded');
    }

    try {
      setLoading(true);
      const updatedMap = await EnhancedConversionService.removeFieldDefinition(state.enhancedMap, fieldName);
      setEnhancedMap(updatedMap);
      return updatedMap;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove field';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [state.enhancedMap]); // Fix: only include state.enhancedMap, not setters

  const getField = useCallback(async (fieldName: string): Promise<FieldDefinition | null> => {
    if (!state.enhancedMap) {
      return null;
    }
    return await EnhancedConversionService.getFieldDefinition(state.enhancedMap, fieldName);
  }, [state.enhancedMap]);

  const transformData = useCallback(async (data: Record<string, any>): Promise<Record<string, any>> => {
    if (!state.enhancedMap) {
      throw new Error('No conversion map loaded');
    }

    try {
      return await EnhancedConversionService.applyFieldTransformations(data, state.enhancedMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to transform data';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [state.enhancedMap]); // Fix: setError is stable, don't include in deps

  const validateData = useCallback(async (data: Record<string, any>): Promise<ValidationResult> => {
    if (!state.enhancedMap) {
      throw new Error('No conversion map loaded');
    }

    try {
      return await EnhancedConversionService.validateFieldValues(data, state.enhancedMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate data';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [state.enhancedMap]); // Fix: setError is stable, don't include in deps

  const generateTableColumns = useCallback(async (context?: string): Promise<TableColumnDefinition[]> => {
    if (!state.enhancedMap) {
      throw new Error('No conversion map loaded');
    }

    try {
      return await EnhancedConversionService.generateTableColumns(state.enhancedMap, context);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate table columns';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [state.enhancedMap]); // Fix: setError is stable, don't include in deps

  const migrateFromSimple = useCallback(async (
    simpleMappings: Record<string, string>, 
    headerRow?: number
  ): Promise<EnhancedConversionMap> => {
    try {
      setLoading(true);
      setError(null);
      
      const migratedMap = await EnhancedConversionService.migrateSimpleToEnhanced(simpleMappings, headerRow);
      setEnhancedMap(migratedMap);
      return migratedMap;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to migrate from simple map';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []); // Fix infinite re-render: state setters are stable, don't include in deps

  const clearError = useCallback(() => {
    setError(null);
  }, []); // Fix: setError is stable, don't include in deps

  const refresh = useCallback(async (): Promise<void> => {
    if (state.enhancedMap) {
      await loadMap(conversionMapPath);
    }
  }, [state.enhancedMap, loadMap, conversionMapPath]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && !state.enhancedMap && !state.loading) {
      loadMap().catch(() => {
        // Error already handled in loadMap
      });
    }
  }, [autoLoad, state.enhancedMap, state.loading, loadMap]);

  return {
    state,
    loadMap,
    saveMap,
    resetToDefault,
    convertHeaders,
    addField,
    updateField,
    removeField,
    getField,
    transformData,
    validateData,
    generateTableColumns,
    migrateFromSimple,
    clearError,
    refresh
  };
};