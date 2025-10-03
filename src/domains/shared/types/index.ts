// Shared Types Index
// Central export point for all shared types

export * from './api-contracts';

// Export enums separately to ensure they can be used as values
export { ProcessingStatus } from './api-contracts';

// Re-export for convenience
export type {
  NetworkConfigRow,
  ProcessingResult,
  ProcessingError,
  ErrorType,
  ValidationError,
  DataValidationResult,
  ApstraConfig,
  ConversionMap,
  ApiResponse,
  AuthResult,
  SystemSearchResult,
  QueryResult,
  ExcelFileInfo,
  ExcelSheetData,
  TauriCommands,
  DomainEvent,
  ProcessingProgressEvent,
  AuthStatusEvent,
  DomainError,
  ExcelError,
  ApstraError,
  ConversionError,
  ProvisioningError,
} from './api-contracts';