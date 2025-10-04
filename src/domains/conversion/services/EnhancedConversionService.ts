import { invoke } from '@tauri-apps/api/tauri';

export type MappingType = 'Exact' | 'Partial' | 'Regex' | 'Fuzzy';
export type DataType = 'String' | 'Number' | 'Boolean' | 'Date' | 'Array' | 'Json';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'Error' | 'Warning' | 'Info';
}

export interface XlsxMapping {
  pattern: string;
  mapping_type: MappingType;
  priority: number;
  case_sensitive: boolean;
}

export interface ApiMapping {
  primary_path: string;
  fallback_paths: string[];
  transformation?: string;
}

export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  allowed_values?: string[];
  numeric_range?: {
    min?: number;
    max?: number;
  };
  custom_rules?: Record<string, any>;
}

export interface UiConfig {
  column_width: number;
  sortable: boolean;
  filterable: boolean;
  hidden: boolean;
}

export interface FieldDefinition {
  display_name: string;
  description: string;
  data_type: DataType;
  is_required: boolean;
  is_key_field: boolean;
  xlsx_mappings: XlsxMapping[];
  api_mappings: ApiMapping[];
  validation_rules: ValidationRules;
  ui_config: UiConfig;
}

export interface TransformationLogic {
  ValueMap?: Record<string, string>;
  Template?: string;
  Function?: string;
  Pipeline?: Array<{
    step_type: string;
    parameters: Record<string, any>;
  }>;
}

export interface TransformationRule {
  name: string;
  description: string;
  rule_type: 'Static' | 'Dynamic' | 'Conditional';
  conditions?: Record<string, any>;
  logic: TransformationLogic;
  priority: number;
}

export interface EnhancedConversionMap {
  version: string;
  header_row?: number;
  field_definitions: Record<string, FieldDefinition>;
  transformation_rules: Record<string, TransformationRule>;
  created_at?: string;
  updated_at?: string;
}

export interface HeaderConversionResult {
  converted_headers: Record<string, string>;
  applied_transformations: Record<string, string>;
  validation_errors: Array<{
    field: string;
    message: string;
    severity: 'Error' | 'Warning' | 'Info';
  }>;
  mapping_confidence: Record<string, number>;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'Error' | 'Warning' | 'Info';
  }>;
  warnings: Array<{
    field: string;
    message: string;
    severity: 'Error' | 'Warning' | 'Info';
  }>;
  field_summary: Record<string, {
    is_valid: boolean;
    error_count: number;
    warning_count: number;
  }>;
}

export interface ApiExtractionResult {
  extracted_data: Record<string, any>;
  extraction_errors: Array<{
    field: string;
    message: string;
    path: string;
  }>;
  success_count: number;
  total_fields: number;
}

export interface TableColumnDefinition {
  field_name: string;
  display_name: string;
  data_type: string;
  width: number;
  sortable: boolean;
  filterable: boolean;
  hidden: boolean;
  required: boolean;
}


class EnhancedConversionService {
  static async loadEnhancedConversionMap(filePath?: string): Promise<EnhancedConversionMap> {
    try {
      return await invoke('load_enhanced_conversion_map', { filePath: filePath });
    } catch (error) {
      console.error('Failed to load enhanced conversion map:', error);
      throw new Error(`Failed to load enhanced conversion map: ${error}`);
    }
  }

  static async saveEnhancedConversionMap(
    enhancedMap: EnhancedConversionMap, 
    filePath: string
  ): Promise<void> {
    try {
      await invoke('save_enhanced_conversion_map', { enhancedMap: enhancedMap, filePath: filePath });
    } catch (error) {
      console.error('Failed to save enhanced conversion map:', error);
      throw new Error(`Failed to save enhanced conversion map: ${error}`);
    }
  }

  static async convertHeadersEnhanced(
    excelHeaders: string[], 
    enhancedMap: EnhancedConversionMap
  ): Promise<HeaderConversionResult> {
    try {
      return await invoke('convert_headers_enhanced', { excelHeaders, enhancedMap });
    } catch (error) {
      console.error('Failed to convert headers with enhanced map:', error);
      throw new Error(`Failed to convert headers: ${error}`);
    }
  }

  static async applyFieldTransformations(
    fieldData: Record<string, string>, 
    enhancedMap: EnhancedConversionMap
  ): Promise<Record<string, string>> {
    try {
      return await invoke('apply_field_transformations', { fieldData, enhancedMap });
    } catch (error) {
      console.error('Failed to apply field transformations:', error);
      throw new Error(`Failed to apply field transformations: ${error}`);
    }
  }

  static async validateFieldValues(
    fieldData: Record<string, string>, 
    enhancedMap: EnhancedConversionMap
  ): Promise<ValidationResult> {
    try {
      return await invoke('validate_field_values', { fieldData, enhancedMap });
    } catch (error) {
      console.error('Failed to validate field values:', error);
      throw new Error(`Failed to validate field values: ${error}`);
    }
  }

  static async extractApiData(
    apiResponse: any, 
    enhancedMap: EnhancedConversionMap
  ): Promise<ApiExtractionResult> {
    try {
      return await invoke('extract_api_data', { apiResponse, enhancedMap });
    } catch (error) {
      console.error('Failed to extract API data:', error);
      throw new Error(`Failed to extract API data: ${error}`);
    }
  }

  static async generateTableColumns(
    enhancedMap: EnhancedConversionMap, 
    context?: string
  ): Promise<TableColumnDefinition[]> {
    try {
      return await invoke('generate_table_columns', { enhancedMap, context });
    } catch (error) {
      console.error('Failed to generate table columns:', error);
      throw new Error(`Failed to generate table columns: ${error}`);
    }
  }

  static async migrateSimpleToEnhanced(
    simpleMappings: Record<string, string>, 
    headerRow?: number
  ): Promise<EnhancedConversionMap> {
    try {
      return await invoke('migrate_simple_to_enhanced', { simpleMappings, headerRow });
    } catch (error) {
      console.error('Failed to migrate simple to enhanced map:', error);
      throw new Error(`Failed to migrate conversion map: ${error}`);
    }
  }

  static async getFieldDefinition(
    enhancedMap: EnhancedConversionMap, 
    fieldName: string
  ): Promise<FieldDefinition | null> {
    try {
      return await invoke('get_field_definition', { enhancedMap, fieldName });
    } catch (error) {
      console.error('Failed to get field definition:', error);
      throw new Error(`Failed to get field definition: ${error}`);
    }
  }

  static async updateFieldDefinition(
    enhancedMap: EnhancedConversionMap, 
    fieldName: string, 
    fieldDefinition: FieldDefinition
  ): Promise<EnhancedConversionMap> {
    try {
      return await invoke('update_field_definition', { 
        enhancedMap, 
        fieldName, 
        fieldDefinition 
      });
    } catch (error) {
      console.error('Failed to update field definition:', error);
      throw new Error(`Failed to update field definition: ${error}`);
    }
  }

  static async removeFieldDefinition(
    enhancedMap: EnhancedConversionMap, 
    fieldName: string
  ): Promise<EnhancedConversionMap> {
    try {
      return await invoke('remove_field_definition', { enhancedMap, fieldName });
    } catch (error) {
      console.error('Failed to remove field definition:', error);
      throw new Error(`Failed to remove field definition: ${error}`);
    }
  }

  static async testTransformationRule(
    inputValue: string, 
    transformationRule: TransformationRule, 
    context?: Record<string, string>
  ): Promise<string> {
    try {
      return await invoke('test_transformation_rule', { 
        inputValue, 
        transformationRule, 
        context 
      });
    } catch (error) {
      console.error('Failed to test transformation rule:', error);
      throw new Error(`Failed to test transformation rule: ${error}`);
    }
  }

  static async validateEnhancedConversionMap(
    enhancedMap: EnhancedConversionMap
  ): Promise<ValidationResult> {
    try {
      return await invoke('validate_enhanced_conversion_map', { enhancedMap });
    } catch (error) {
      console.error('Failed to validate enhanced conversion map:', error);
      throw new Error(`Failed to validate enhanced conversion map: ${error}`);
    }
  }

  static async getAvailableTransformations(): Promise<string[]> {
    try {
      return await invoke('get_available_transformations');
    } catch (error) {
      console.error('Failed to get available transformations:', error);
      throw new Error(`Failed to get available transformations: ${error}`);
    }
  }

  static async createDefaultFieldDefinition(
    fieldName: string, 
    displayName: string
  ): Promise<FieldDefinition> {
    try {
      return await invoke('create_default_field_definition', { fieldName, displayName });
    } catch (error) {
      console.error('Failed to create default field definition:', error);
      throw new Error(`Failed to create default field definition: ${error}`);
    }
  }

  // Utility methods for working with enhanced conversion maps
  static getRequiredFields(enhancedMap: EnhancedConversionMap): string[] {
    return Object.entries(enhancedMap.field_definitions)
      .filter(([_, definition]) => definition.is_required)
      .map(([fieldName, _]) => fieldName);
  }

  static getKeyFields(enhancedMap: EnhancedConversionMap): string[] {
    return Object.entries(enhancedMap.field_definitions)
      .filter(([_, definition]) => definition.is_key_field)
      .map(([fieldName, _]) => fieldName);
  }

  static getVisibleFields(enhancedMap: EnhancedConversionMap): string[] {
    return Object.entries(enhancedMap.field_definitions)
      .filter(([_, definition]) => !definition.ui_config.hidden)
      .map(([fieldName, _]) => fieldName);
  }

  static getFieldsByDataType(enhancedMap: EnhancedConversionMap, dataType: string): string[] {
    return Object.entries(enhancedMap.field_definitions)
      .filter(([_, definition]) => definition.data_type === dataType)
      .map(([fieldName, _]) => fieldName);
  }

  static createEmptyEnhancedMap(): EnhancedConversionMap {
    return {
      version: '1.0.0',
      header_row: 2,
      field_definitions: {},
      transformation_rules: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

export { EnhancedConversionService };
export default EnhancedConversionService;