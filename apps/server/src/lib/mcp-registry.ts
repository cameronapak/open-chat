// MCP Registry SDK - Simple class-based client for the official MCP Registry API
// TypeScript interfaces based on the MCP Registry API documentation

export interface ServerMeta {
  id: string;
  is_latest: boolean;
  published_at: string;
  updated_at: string;
}

export interface PublisherMeta {
  [key: string]: any;
}

export interface Meta {
  "io.modelcontextprotocol.registry/official": ServerMeta;
  "io.modelcontextprotocol.registry/publisher-provided": PublisherMeta;
}

export interface Argument {
  choices?: string[];
  default?: string;
  description?: string;
  format?: string;
  is_required?: boolean;
  is_secret?: boolean;
  is_repeated?: boolean;
  name?: string;
  type?: string;
  value?: string;
  value_hint?: string;
  variables?: Record<string, Argument>;
}

export interface Transport {
  type: string;
  url: string;
  headers?: Argument[];
}

export interface Package {
  environment_variables?: Argument[];
  file_sha256?: string;
  identifier?: string;
  package_arguments?: Argument[];
  registry_base_url?: string;
  registry_type?: string;
  runtime_arguments?: Argument[];
  runtime_hint?: string;
  transport?: Transport;
  version?: string;
}

export interface Remote {
  type: string;
  url: string;
  headers?: Argument[];
}

export interface Repository {
  id: string;
  source: string;
  subfolder?: string;
  url: string;
}

export interface Server {
  $schema?: string;
  _meta?: Meta;
  description: string;
  name: string;
  packages?: Package[] | null;
  remotes?: Remote[] | null;
  repository?: Repository;
  status?: string;
  version: string;
}

export interface ServerListMetadata {
  count: number;
  next_cursor?: string;
}

export interface ServerListResponse {
  metadata: ServerListMetadata;
  servers: Server[] | null;
}

export interface ListServersOptions {
  cursor?: string;
  limit?: number;
  search?: string;
  updated_since?: string;
  version?: string;
}

/**
 * Interface for GitHub token exchange request body
 */
export interface GitHubTokenExchangeInputBody {
  github_token: string;
}

/**
 * Interface for token exchange response
 */
export interface TokenResponse {
  expires_at: number;
  registry_token: string;
}

/**
 * Interface for GitHub OIDC token exchange request body
 */
export interface GitHubOIDCTokenExchangeInputBody {
  oidc_token: string;
}

/**
 * Interface for HTTP signature token exchange request body
 */
export interface HTTPTokenExchangeInputBody {
  domain: string;
  signed_timestamp: string;
  timestamp: string;
}

/**
 * Authentication namespace for MCP Registry API
 */
export class AuthNamespace {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Exchange GitHub OAuth access token for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-github-token}
   */
  async exchangeGitHubOAuthAccessTokenForRegistryJWT(
    githubToken: string
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/auth/github-at`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        github_token: githubToken
      })
    });

    if (!response.ok) {
      throw new Error(
        `Failed to exchange GitHub token: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Exchange GitHub OIDC token for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-github-oidc-token}
   */
  async exchangeGitHubOIDCTokenForRegistryJWT(
    oidcToken: string
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/auth/github-oidc`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        oidc_token: oidcToken
      })
    });

    if (!response.ok) {
      throw new Error(
        `Failed to exchange GitHub OIDC token: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Exchange HTTP signature for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-http-token}
   */
  async exchangeHTTPSignatureForRegistryJWT(
    domain: string,
    signedTimestamp: string,
    timestamp: string
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/auth/http`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        domain: domain,
        signed_timestamp: signedTimestamp,
        timestamp: timestamp
      })
    });

    if (!response.ok) {
      throw new Error(
        `Failed to exchange HTTP signature: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }
}

/**
 * Server namespace for MCP Registry API
 */
export class ServerNamespace {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * List MCP servers with optional filtering and pagination
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/list-servers}
   */
  async listServers(
    options: ListServersOptions = {},
  ): Promise<ServerListResponse> {
    const params = new URLSearchParams();

    if (options.cursor) params.append("cursor", options.cursor);
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.search) params.append("search", options.search);
    if (options.updated_since) {
      params.append("updated_since", options.updated_since);
    }
    if (options.version) params.append("version", options.version);

    const url = `${this.baseUrl}/v0/servers${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to list servers: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Get detailed information about a specific MCP server
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/get-server}
   */
  async getServer(id: string): Promise<Server> {
    const url = `${this.baseUrl}/v0/servers/${id}`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get server ${id}: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }
}

/**
 * Simple client for the official MCP Registry API
 */
export class MCPRegistryClient {
  private baseUrl: string;
  public auth: AuthNamespace;
  public server: ServerNamespace;

  constructor(baseUrl: string = "https://registry.modelcontextprotocol.io") {
    this.baseUrl = baseUrl;
    this.auth = new AuthNamespace(this.baseUrl);
    this.server = new ServerNamespace(this.baseUrl);
  }
}
