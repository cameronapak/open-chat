export interface RegistryExtensions {
  serverId: string;
  versionId: string;
  publishedAt: string;
  updatedAt?: string;
  isLatest: boolean;
}

export interface ServerMeta {
  "io.modelcontextprotocol.registry/official"?: RegistryExtensions;
  "io.modelcontextprotocol.registry/publisher-provided"?: { [key: string]: any };
}

/**
 * Interface for input
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/Input}
 */
export interface Input {
  /**
   * Array of choices or null
   */
  choices?: string[] | null;
  
  /**
   * Default value
   */
  default?: string;
  
  /**
   * Description of the input
   */
  description?: string;
  
  /**
   * Format of the input
   */
  format?: string;
  
  /**
   * Whether the input is required
   */
  is_required?: boolean;
  
  /**
   * Whether the input is secret
   */
  is_secret?: boolean;
  
  /**
   * Whether the input is repeated
   */
  is_repeated?: boolean;
  
  /**
   * Name of the input
   */
  name?: string;
  
  /**
   * Type of the input
   */
  type?: string;
  
  /**
   * Value of the input
   */
  value?: string;
  
  /**
   * Value hint for the input
   */
  value_hint?: string;
  
  /**
   * Variables for the input
   */
  variables?: Record<string, Input>;
}

/**
 * Interface for input
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/Input}
 */
export interface Input {
  /**
   * Array of choices or null
   *
   * Example:
   * ["string"]
   */
  choices?: string[] | null;
  
  /**
   * Default value
   *
   * Example:
   * "string"
   */
  default?: string;
  
  /**
   * Description of the input
   *
   * Example:
   * "string"
   */
  description?: string;
  
  /**
   * Format of the input
   *
   * Example:
   * "string"
   */
  format?: string;
  
  /**
   * Whether the input is required
   *
   * Example:
   * true
   */
  isRequired?: boolean;
  
  /**
   * Whether the input is secret
   *
   * Example:
   * true
   */
  isSecret?: boolean;
  
  /**
   * Value of the input
   *
   * Example:
   * "string"
   */
  value?: string;
}

/**
 * Interface for key value input
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/KeyValueInput}
 */
export interface KeyValueInput {
  /**
   * Array of choices or null
   *
   * Example:
   * ["string"]
   */
  choices?: string[] | null;
  
  /**
   * Default value
   *
   * Example:
   * "string"
   */
  default?: string;
  
  /**
   * Description of the input
   *
   * Example:
   * "string"
   */
  description?: string;
  
  /**
   * Format of the input
   *
   * Example:
   * "string"
   */
  format?: string;
  
  /**
   * Whether the input is required
   *
   * Example:
   * true
   */
  isRequired?: boolean;
  
  /**
   * Whether the input is secret
   *
   * Example:
   * true
   */
  isSecret?: boolean;
  
  /**
   * Name of the input (required)
   *
   * Example:
   * "string"
   */
  name: string;
  
  /**
   * Value of the input
   *
   * Example:
   * "string"
   */
  value?: string;
  
  /**
   * Variables for the input (dictionary of KeyValueInput)
   */
  variables?: Record<string, KeyValueInput>;
}

/**
 * Interface for ping response body
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/PingBody}
 */
export interface PingBody {
  /**
   * Ping response
   * @example true
   */
  pong: boolean;
}

/**
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/Transport}
 */
export interface Transport {
  type: string;
  url: string;
  headers?: Input[];
}

/**
 * Interface for package
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/Package}
 */
export interface Package {
  /**
   * Environment variables for the package
   *
   * Example:
   * [{"choices": [null], "default": "string", "description": "string", "format": "string", "isRequired": true, "isSecret": true, "name": "string", "value": "string", "variables": {}}]
   */
  environment_variables?: Input[] | null;
  
  /**
   * SHA256 hash of the package file
   *
   * Example:
   * "string"
   */
  file_sha256?: string;
  
  /**
   * Package identifier
   *
   * Example:
   * "string"
   */
  identifier: string;
  
  /**
   * Package arguments
   *
   * Example:
   * [{"choices": [null], "default": "string", "description": "string", "format": "string", "isRepeated": true, "isRequired": true, "isSecret": true, "name": "string", "type": "string", "value": "string", "valueHint": "string", "variables": {}}]
   */
  package_arguments?: Input[] | null;
  
  /**
   * Registry base URL
   *
   * Example:
   * "string"
   */
  registry_base_url?: string;
  
  /**
   * Registry type
   *
   * Example:
   * "string"
   */
  registry_type: string;
  
  /**
   * Runtime arguments
   *
   * Example:
   * [{"choices": [null], "default": "string", "description": "string", "format": "string", "isRepeated": true, "isRequired": true, "isSecret": true, "name": "string", "type": "string", "value": "string", "valueHint": "string", "variables": {}}]
   */
  runtime_arguments?: Input[] | null;
  
  /**
   * Runtime hint
   *
   * Example:
   * "string"
   */
  runtime_hint?: string;
  
  /**
   * Transport configuration
   */
  transport?: Transport;
  
  /**
   * Package version
   *
   * Example:
   * "string"
   */
  version: string;
}

export interface Remote {
  type: string;
  url: string;
  headers?: Input[];
}

/**
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/Repository}
 */
export interface Repository {
  id: string;
  source: string;
  subfolder?: string;
  url: string;
}

export interface Server {
  $schema?: string;
  name: string;
  description: string;
  status?: string;
  repository?: Repository;
  version: string;
  websiteUrl?: string;
  packages?: Package[] | null;
  remotes?: Remote[] | null;
  _meta?: ServerMeta;
}

export interface Metadata {
  next_cursor?: string;
  count: number;
}

export interface ServerListResponse {
  servers: Server[];
  metadata: Metadata;
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
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/GitHubTokenExchangeInputBody}
 */
export interface GitHubTokenExchangeInputBody {
  /**
   * GitHub OAuth access token
   */
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
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/GitHubOIDCTokenExchangeInputBody}
 */
export interface GitHubOIDCTokenExchangeInputBody {
  /**
   * GitHub Actions OIDC token
   */
  oidc_token: string;
}

/**
 * Interface for HTTP signature token exchange request body
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/HTTPTokenExchangeInputBody}
 */
export interface HTTPTokenExchangeInputBody {
  /**
   * Domain name
   * @example "example.com"
   */
  domain: string;
  
  /**
   * Hex-encoded Ed25519 signature of timestamp
   * @example "abcdef1234567890"
   */
  signed_timestamp: string;
  
  /**
   * RFC3339 timestamp
   * @example "2023-01-01T00:00:00Z"
   */
  timestamp: string;
}

/**
 * Interface for OIDC token exchange request body
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/OIDCTokenExchangeInputBody}
 */
export interface OIDCTokenExchangeInputBody {
  /**
   * OIDC ID token
   */
  oidc_token: string;
}

/**
 * Interface for DNS token exchange request body
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/DNSTokenExchangeInputBody}
 */
export interface DNSTokenExchangeInputBody {
  /**
   * Domain name
   * @example "example.com"
   */
  domain: string;
  
  /**
   * Hex-encoded Ed25519 signature of timestamp
   * @example "abcdef1234567890"
   */
  signed_timestamp: string;
  
  /**
   * RFC3339 timestamp
   * @example "2023-01-01T00:00:00Z"
   */
  timestamp: string;
}

/**
 * Interface for health check response
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/HealthBody}
 */
export interface HealthBody {
  /**
   * GitHub OAuth App Client ID
   */
  github_client_id?: string;
  
  /**
   * Health status
   * @example "ok"
   */
  status: string;
}

/**
 * Interface for error detail
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/ErrorDetail}
 */
export interface ErrorDetail {
  /**
   * Where the error occurred, e.g. 'body.items[3].tags' or 'path.thing-id'
   */
  location: string;
  
  /**
   * Error message text
   */
  message: string;
  
  /**
   * The value at the given location
   */
  value: any;
}

/**
 * Interface for error model
 * {@see https://registry.modelcontextprotocol.io/docs#/schemas/ErrorModel}
 */
export interface ErrorModel {
  /**
   * A human-readable explanation specific to this occurrence of the problem.
   * @example "Property foo is required but is missing."
   */
  detail: string;
  
  /**
   * Optional list of individual error details
   */
  errors: ErrorDetail[] | null;
  
  /**
   * A URI reference that identifies the specific occurrence of the problem.
   * @example "https://example.com/error-log/abc123"
   */
  instance: string;
  
  /**
   * HTTP status code
   * @example 400
   */
  status: number;
  
  /**
   * A short, human-readable summary of the problem type. This value should not change between occurrences of the error.
   * @example "Bad Request"
   */
  title: string;
  
  /**
   * A URI reference to human-readable documentation for the error.
   * @default "about:blank"
   * @example "https://example.com/errors/example"
   */
  type: string;
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
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to exchange GitHub token: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to exchange GitHub token: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`
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
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to exchange GitHub OIDC token: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to exchange GitHub OIDC token: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`
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
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to exchange HTTP signature: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to exchange HTTP signature: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Exchange OIDC ID token for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-oidc-token}
   */
  async exchangeOIDCIDTokenForRegistryJWT(
    oidcToken: string
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/auth/oidc`;
    
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
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to exchange OIDC token: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to exchange OIDC token: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Exchange DNS signature for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-dns-token}
   */
  async exchangeDNSSignatureForRegistryJWT(
    dnsTokenExchangeInput: DNSTokenExchangeInputBody
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/auth/dns`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dnsTokenExchangeInput)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to exchange DNS signature: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to exchange DNS signature: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`
      );
    }

    return await response.json();
  }
}

/**
 * Health namespace for MCP Registry API
 */
export class HealthNamespace {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check the health status of the API
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/get-health}
   */
  async getHealth(): Promise<HealthBody> {
    const url = `${this.baseUrl}/v0/health`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to get health status: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to get health status: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`
      );
    }

    return await response.json();
  }
}

/**
 * Ping namespace for MCP Registry API
 */
export class PingNamespace {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Ping the registry API
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/ping}
   */
  async ping(): Promise<PingBody> {
    const url = `${this.baseUrl}/v0/ping`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to ping: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to ping: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`
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
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to list servers: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to list servers: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`,
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
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to get server ${id}: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to get server ${id}: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`,
      );
    }

    return await response.json();
  }
}

/**
 * Admin namespace for MCP Registry API
 */
export class AdminNamespace {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Update an existing MCP server (admin only)
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/edit-server}
   */
  async editServer(
    serverId: string,
    version: string,
    server: Server,
    registryToken: string
  ): Promise<Server> {
    const url = `${this.baseUrl}/v0/servers/${serverId}?version=${version}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json",
        "Authorization": registryToken
      },
      body: JSON.stringify(server)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to edit server: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to edit server: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`
      );
    }

    return await response.json();
  }
}

/**
 * Publish namespace for MCP Registry API
 */
export class PublishNamespace {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Publish a new MCP server to the registry or update an existing one
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/publish-server}
   */
  async publishServer(
    server: Server,
    registryToken: string
  ): Promise<Server> {
    const url = `${this.baseUrl}/v0/publish`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json",
        "Authorization": registryToken
      },
      body: JSON.stringify(server)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorModel: ErrorModel;
      
      try {
        errorModel = JSON.parse(errorText);
      } catch {
        errorModel = {
          detail: errorText || `Failed to publish server: ${response.status} ${response.statusText}`,
          errors: null,
          instance: "",
          status: response.status,
          title: response.statusText,
          type: "about:blank"
        };
      }
      
      throw new Error(
        `Failed to publish server: ${errorModel.title || response.statusText} - ${errorModel.detail || errorText}`
      );
    }

    return await response.json();
  }
}

/**
 * MCP Registry SDK - Simple class-based client for the official MCP Registry API
 * {@see https://registry.modelcontextprotocol.io/docs}
 */
export class MCPRegistryClient {
  private baseUrl: string;
  public auth: AuthNamespace;
  public server: ServerNamespace;
  public health: HealthNamespace;
  public ping: PingNamespace;
  public publish: PublishNamespace;
  public admin: AdminNamespace;

  constructor(baseUrl: string = "https://registry.modelcontextprotocol.io") {
    this.baseUrl = baseUrl;
    this.auth = new AuthNamespace(this.baseUrl);
    this.server = new ServerNamespace(this.baseUrl);
    this.health = new HealthNamespace(this.baseUrl);
    this.ping = new PingNamespace(this.baseUrl);
    this.publish = new PublishNamespace(this.baseUrl);
    this.admin = new AdminNamespace(this.baseUrl);
  }
}
