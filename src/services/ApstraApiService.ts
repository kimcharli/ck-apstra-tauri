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
   * Query all connectivity in a blueprint to compare with provisioning table
   */
  public async queryConnectivity(blueprintId: string): Promise<QueryResponse> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    // Complex graph query to get switch-to-server connectivity information
    const connectivityQuery = `
      match(
        node('system', system_type='switch', name='switch')
         .out('hosted_interfaces').node('interface', if_type='ethernet', name='intf1')
          .out('link').node('link', name='link1')
          .in_('link').node(name='intf2')
          .in_('hosted_interfaces').node('system', system_type='server', name='server'),
        optional(
          node(name='switch').out('part_of_redundancy_group').node('redundancy_group', name='rg1')
            .out('hosted_interfaces').node('interface', name='evpn1')
            .out('link').node('link', name='evpn-link')
            .in_('link').node('interface', name='evpn2')
            .in_('hosted_interfaces').node(name='server'),
          ),
        optional(
          node(name='rg1').out('hosted_interfaces').node(name='evpn1')
            .out('composed_of').node(name='ae1')
            .out('composed_of').node(name='intf1')
          ),
        optional(
          node(name='rg1').out('hosted_interfaces').node(name='evpn1')
            .out().node(name='intf1')
         )
      )
    `;

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
  public static createSystemQuery(serverName: string): string {
    const query = `match(node('system', label='${serverName}', name='system'))`;
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