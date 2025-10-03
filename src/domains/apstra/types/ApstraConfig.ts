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

export interface ApstraConfigInfo {
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  config: ApstraConfig;
}

export interface ApstraConfigUIState {
  isLoading: boolean;
  currentConfig: ApstraConfig | null;
  isTestingConnection: boolean;
  connectionStatus: 'unknown' | 'success' | 'failed';
  validationErrors: string[];
}