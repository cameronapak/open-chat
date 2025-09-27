import type {
  PingBody,
  Server,
  ServerListResponse,
  ListServersOptions,
  TokenResponse,
  DNSTokenExchangeInputBody,
  HTTPTokenExchangeInputBody,
  HealthBody,
  ErrorModel,
  GitHubTokenExchangeInputBody,
  GitHubOIDCTokenExchangeInputBody,
  OIDCTokenExchangeInputBody,
} from './types.zod';

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
    { github_token }: GitHubTokenExchangeInputBody
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/auth/github-at`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        github_token: github_token
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
    { oidc_token }: GitHubOIDCTokenExchangeInputBody
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/auth/github-oidc`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        oidc_token
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
  async exchangeHTTPSignatureForRegistryJWT({
    domain,
    signed_timestamp,
    timestamp
  }: HTTPTokenExchangeInputBody): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/auth/http`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        domain: domain,
        signed_timestamp: signed_timestamp,
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
    { oidc_token }: OIDCTokenExchangeInputBody
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/auth/oidc`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        oidc_token: oidc_token
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