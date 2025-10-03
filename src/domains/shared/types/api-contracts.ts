// Shared API Contracts
// These types define the contracts between frontend and backend across all domains

// ============================================================================
// Core Data Types
// ============================================================================

export interface NetworkConfigRow {
  blueprint?: string;
  server_label?: string;
  is_external?: boolean;
  server_tags?: string;
  switch_tags?: string;
  link_group_ifname?: string;
  link_group_lag_mode?: string;
  link_group_ct_names?: string;
  link_group_tags?: string;
  link_speed?: string;
  server_ifname?: string;
  switch_label?: string;
  switch_ifname?: string;
  link_tags?: string;
  comment?: string;
}

// ============================================================================
// Processing and Results
// ============================================================================

export interface ProcessingResult {
  job_id: string;
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  success_rate: number;
  errors: ProcessingError[];
  status: ProcessingStatus;
}

export interface ProcessingError {
  row_index: number;
  error_message: string;
  error_type: ErrorType;
}

export enum ProcessingStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
}

export enum ErrorType {
  ValidationError = 'ValidationError',
  NetworkError = 'NetworkError',
  DataError = 'DataError',
  SystemError = 'SystemError',
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  row_index: number;
  field: string;
  message: string;
}

export interface DataValidationResult {
  valid_rows: NetworkConfigRow[];
  invalid_rows: NetworkConfigRow[];
  errors: ValidationError[];
  duplicates_removed: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ApstraConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  blueprint_name: string;
  use_ssl?: boolean;
  verify_ssl?: boolean;
  timeout?: number;
}

export interface ConversionMap {
  header_row?: number;
  mappings: Record<string, string>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  expires_at?: string;
  error?: string;
}

export interface SystemSearchResult {
  id: string;
  label: string;
  hostname?: string;
  system_type: string;
  blueprint_id?: string;
}

export interface QueryResult {
  data: any;
  errors?: string[];
  execution_time?: number;
}

// ============================================================================
// File Processing Types
// ============================================================================

export interface ExcelFileInfo {
  file_path: string;
  sheet_names: string[];
  total_sheets: number;
}

export interface ExcelSheetData {
  sheet_name: string;
  headers: string[];
  rows: any[][];
  total_rows: number;
}

// ============================================================================
// Tauri Command Contracts
// ============================================================================

export interface TauriCommands {
  // Excel Domain Commands
  'upload_excel_file': (filePath: string) => Promise<string[]>;
  'parse_excel_sheet': (filePath: string, sheetName: string) => Promise<NetworkConfigRow[]>;
  
  // Apstra Domain Commands
  'apstra_login': (config: ApstraConfig) => Promise<AuthResult>;
  'apstra_search_systems': (query: string) => Promise<SystemSearchResult[]>;
  'apstra_execute_query': (query: string) => Promise<QueryResult>;
  'test_apstra_connection': (config: ApstraConfig) => Promise<ApiResponse<boolean>>;
  
  // Conversion Domain Commands
  'convert_headers_enhanced': (headers: string[], map: ConversionMap) => Promise<ApiResponse<any>>;
  'load_enhanced_conversion_map': () => Promise<ApiResponse<ConversionMap>>;
  'save_enhanced_conversion_map': (map: ConversionMap) => Promise<ApiResponse<boolean>>;
  
  // Provisioning Domain Commands
  'process_import_generic_system': (data: NetworkConfigRow[], config: ApstraConfig) => Promise<ProcessingResult>;
  'get_processing_progress': (jobId: string) => Promise<ProcessingResult>;
  
  // Shared Commands
  'send_backend_log': (level: string, message: string) => Promise<void>;
  'cleanup_temp_file': (filePath: string) => Promise<boolean>;
}

// ============================================================================
// Domain Event Types
// ============================================================================

export interface DomainEvent {
  domain: string;
  event_type: string;
  payload: any;
  timestamp: string;
}

export interface ProcessingProgressEvent extends DomainEvent {
  domain: 'provisioning';
  event_type: 'processing_progress';
  payload: {
    job_id: string;
    progress: number;
    status: ProcessingStatus;
    current_row?: number;
    total_rows?: number;
  };
}

export interface AuthStatusEvent extends DomainEvent {
  domain: 'apstra';
  event_type: 'auth_status_changed';
  payload: {
    authenticated: boolean;
    expires_at?: string;
  };
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface DomainError {
  domain: string;
  error_type: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ExcelError extends DomainError {
  domain: 'excel';
  error_type: 'file_not_found' | 'invalid_sheet' | 'parse_error';
}

export interface ApstraError extends DomainError {
  domain: 'apstra';
  error_type: 'auth_failed' | 'api_request_failed' | 'invalid_config';
}

export interface ConversionError extends DomainError {
  domain: 'conversion';
  error_type: 'mapping_error' | 'validation_error' | 'transformation_error';
}

export interface ProvisioningError extends DomainError {
  domain: 'provisioning';
  error_type: 'processing_error' | 'network_error' | 'data_error';
}