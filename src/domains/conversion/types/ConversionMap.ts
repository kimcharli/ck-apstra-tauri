export interface ConversionMap {
  header_row?: number;
  mappings: Record<string, string>;
}

export interface ConversionMapInfo {
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  map: ConversionMap;
}

export interface HeaderMapping {
  excelHeader: string;
  targetField: string;
  isActive: boolean;
}

export interface ConversionMapUIState {
  isLoading: boolean;
  currentMap: ConversionMap | null;
  availableFields: string[];
  customMappings: HeaderMapping[];
  headerRow: number;
}