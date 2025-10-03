export interface AuthState {
  isAuthenticated: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  error: AuthError | null;
  sessionId: string | null;
}

export interface AuthError {
  type: 'NETWORK' | 'AUTHENTICATION' | 'SESSION_EXPIRED' | 'UNKNOWN';
  message: string;
  timestamp: Date;
}

export interface AuthContextType {
  authState: AuthState;
  authenticate: (baseUrl: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthentication: () => Promise<void>;
  clearError: () => void;
}

export interface LoginCredentials {
  baseUrl: string;
  username: string;
  password: string;
}