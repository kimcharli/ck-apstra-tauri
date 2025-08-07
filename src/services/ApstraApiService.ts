import { invoke } from '@tauri-apps/api/tauri';

export interface LoginInfo {
  base_url: string;
  username: string;
  password: string;
  session_id: string;
}

export interface LoginResult {
  session_id: string;
  user_id: string;
  token: string;
}

export interface SystemSearchRequest {
  session_id: string;
  blueprint_id: string;
  server_name: string;
}

export interface QueryResponse {
  items: Array<{ [key: string]: any }>;
  count: number;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApstraApiService {
  private static instance: ApstraApiService;
  private sessionId: string;
  private isAuthenticated: boolean = false;

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public static getInstance(): ApstraApiService {
    if (!ApstraApiService.instance) {
      ApstraApiService.instance = new ApstraApiService();
    }
    return ApstraApiService.instance;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getAuthStatus(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Login to Apstra API
   */
  public async login(baseUrl: string, username: string, password: string): Promise<LoginResult> {
    const loginInfo: LoginInfo = {
      base_url: baseUrl,
      username,
      password,
      session_id: this.sessionId,
    };

    try {
      const result = await invoke<ApiResult<LoginResult>>('apstra_login', { loginInfo });
      
      if (result.success && result.data) {
        this.isAuthenticated = true;
        return result.data;
      } else {
        this.isAuthenticated = false;
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      this.isAuthenticated = false;
      throw error;
    }
  }

  /**
   * Search for systems in a blueprint
   */
  public async searchSystems(blueprintId: string, serverName: string): Promise<QueryResponse> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    const searchRequest: SystemSearchRequest = {
      session_id: this.sessionId,
      blueprint_id: blueprintId,
      server_name: serverName,
    };

    try {
      const result = await invoke<ApiResult<QueryResponse>>('apstra_search_systems', { searchRequest });
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'System search failed');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute a custom query against a blueprint
   */
  public async executeQuery(blueprintId: string, query: string): Promise<QueryResponse> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const result = await invoke<ApiResult<QueryResponse>>('apstra_execute_query', {
        sessionId: this.sessionId,
        blueprintId,
        query,
      });
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Query execution failed');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if the current session is authenticated
   */
  public async checkAuthentication(): Promise<boolean> {
    try {
      const result = await invoke<ApiResult<boolean>>('apstra_is_authenticated', {
        sessionId: this.sessionId,
      });
      
      this.isAuthenticated = result.success && result.data === true;
      return this.isAuthenticated;
    } catch (error) {
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Logout and clear the session
   */
  public async logout(): Promise<void> {
    try {
      await invoke<ApiResult<void>>('apstra_logout', {
        sessionId: this.sessionId,
      });
    } catch (error) {
      console.warn('Logout failed:', error);
    } finally {
      this.isAuthenticated = false;
    }
  }

  /**
   * Helper method to create a system search query
   */
  public static createSystemQuery(serverName: string): string {
    return `match(node('system', label='${serverName}', name='system'))`;
  }
}

// Export a singleton instance
export const apstraApiService = ApstraApiService.getInstance();