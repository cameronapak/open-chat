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
 * Simple client for the official MCP Registry API
 */
export class MCPRegistryClient {
  private baseUrl: string;

  constructor(baseUrl: string = "https://registry.modelcontextprotocol.io") {
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
