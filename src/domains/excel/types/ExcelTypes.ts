export interface ExcelFile {
  path: string;
  sheets: string[];
}

export interface ExcelSheet {
  name: string;
  data: ExcelRow[];
}

export interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

export interface ExcelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExcelProcessingOptions {
  skipEmptyRows?: boolean;
  trimWhitespace?: boolean;
  headerRow?: number;
}