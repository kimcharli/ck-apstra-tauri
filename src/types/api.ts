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