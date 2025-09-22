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
  private baseUrl: string = '';
  private queryTemplates: { [key: string]: string } = {};

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load query templates from data file
   */
  private async loadQueryTemplates(): Promise<void> {
    if (Object.keys(this.queryTemplates).length === 0) {
      try {
        const result = await invoke<ApiResult<{ [key: string]: string }>>('load_apstra_queries');
        if (result.success && result.data) {
          this.queryTemplates = result.data;
        }
      } catch (error) {
        console.error('Failed to load query templates:', error);
        // Use fallback hardcoded queries if loading fails
      }
    }
  }

  /**
   * Get a query template with parameter substitution
   */
  private async getQuery(queryName: string, params: { [key: string]: string } = {}): Promise<string> {
    await this.loadQueryTemplates();
    
    let query = this.queryTemplates[queryName];
    if (!query) {
      throw new Error(`Query template '${queryName}' not found`);
    }
    
    // Replace placeholders with actual values
    for (const [key, value] of Object.entries(params)) {
      query = query.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    
    return query;
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

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getHost(): string {
    if (!this.baseUrl) return '';
    try {
      const url = new URL(this.baseUrl);
      return url.host;
    } catch {
      return this.baseUrl;
    }
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
        this.baseUrl = baseUrl;
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
   * Search for a system across all blueprints and return the found blueprint info
   */
  public async searchSystemAcrossBlueprints(serverName: string, blueprints: Array<{id: string, label: string}>): Promise<{
    blueprintId: string;
    blueprintLabel: string;
    response: QueryResponse;
  } | null> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    for (const blueprint of blueprints) {
      try {
        const response = await this.searchSystems(blueprint.id, serverName);
        if (response.count > 0) {
          return {
            blueprintId: blueprint.id,
            blueprintLabel: blueprint.label,
            response
          };
        }
      } catch (error) {
        // Continue searching other blueprints if this one fails
        console.warn(`Search failed for blueprint ${blueprint.label}:`, error);
      }
    }
    
    return null; // System not found in any blueprint
  }

  /**
   * Trim and normalize query string - removes leading/trailing whitespace and newlines
   */
  private static normalizeQuery(query: string): string {
    return query.trim().replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');
  }

  /**
   * Execute a custom query against a blueprint
   */
  public async executeQuery(blueprintId: string, query: string): Promise<QueryResponse> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const normalizedQuery = ApstraApiService.normalizeQuery(query);
      
      // Query details are logged in Rust backend for download via log export
      
      const result = await invoke<ApiResult<QueryResponse>>('apstra_execute_query', {
        sessionId: this.sessionId,
        blueprintId,
        query: normalizedQuery,
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
   * Query connectivity in a blueprint to compare with provisioning table
   * Optimized to filter by specific switch labels present in the table data
   */
  public async queryConnectivity(blueprintId: string, switchLabels?: string[]): Promise<QueryResponse> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    // Build switch filter clause for optimization
    let switchFilter = '';
    if (switchLabels && switchLabels.length > 0) {
      const labelsList = switchLabels.map(label => `'${label}'`).join(', ');
      switchFilter = `, label=is_in([${labelsList}])`;
    }

    // Load connectivity templates query from template (includes both connectivity and CT data)
    const connectivityQuery = await this.getQuery('connectivity_templates_query', {
      switch_filter: switchFilter
    });

    return await this.executeQuery(blueprintId, connectivityQuery);
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
   * Search for systems with pod and rack information using graph query
   */
  public async searchSystemsWithTopology(blueprintId: string, serverName: string): Promise<QueryResponse> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    const query = ApstraApiService.createSystemWithTopologyQuery(serverName);
    return await this.executeQuery(blueprintId, query);
  }

  /**
   * Search for IP addresses with system, pod and rack information using graph query
   */
  public async searchIPsWithTopology(blueprintId: string, ipAddress: string): Promise<QueryResponse> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    const query = ApstraApiService.createIPWithTopologyQuery(ipAddress);
    return await this.executeQuery(blueprintId, query);
  }

  /**
   * Dump complete blueprint JSON data using direct API call
   */
  public async dumpBlueprint(blueprintId: string): Promise<any> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const result = await invoke<ApiResult<any>>('apstra_dump_blueprint', {
        sessionId: this.sessionId,
        blueprintId,
      });
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Blueprint dump failed');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Helper method to create a system search query
   */
  public static async createSystemQuery(serverName: string): Promise<string> {
    // Use instance method to access query templates
    const instance = ApstraApiService.getInstance();
    const query = await instance.getQuery('system_search_query', {
      server_name: serverName
    });
    return ApstraApiService.normalizeQuery(query);
  }

  /**
   * Helper method to create a system search query with topology
   */
  public static createSystemWithTopologyQuery(serverName: string): string {
    const query = `match(
      node('system', label='${serverName}', name='system')
        .out().node('pod', name='pod'),
      node(name='system')
        .out().node('rack', name='rack')
    )`;
    return ApstraApiService.normalizeQuery(query);
  }

  /**
   * Helper method to create an IP search query with topology
   */
  public static createIPWithTopologyQuery(ipAddress: string): string {
    const query = `match(
      node('interface', ipv4_addr='${ipAddress}', name='intf').in_().node('system', name='system')
        .out().node('pod', name='pod'),
      node(name='system').out().node('rack', name='rack')
    )`;
    return ApstraApiService.normalizeQuery(query);
  }
}

// Export a singleton instance
export const apstraApiService = ApstraApiService.getInstance();