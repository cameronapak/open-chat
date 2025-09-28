// Define the types for client-side MCP server storage
// These match the server's Server type exactly
export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  $schema?: string;
  status?: string;
  websiteUrl?: string;
  repository?: {
    id: string;
    source: string;
    url: string;
    subfolder?: string;
  };
  packages?: Array<{
    identifier: string;
    version: string;
    registry_type: string;
    environment_variables?: Array<{
      choices?: string[] | null;
      default?: string;
      description?: string;
      format?: string;
      isRequired?: boolean;
      isSecret?: boolean;
      value?: string;
    }>;
  }>;
  remotes?: Array<{
    type: string;
    url: string;
    headers?: Array<{
      choices?: string[] | null;
      default?: string;
      description?: string;
      format?: string;
      isRequired?: boolean;
      isSecret?: boolean;
      value?: string;
    }>;
  }>;
}

export interface SavedMCPServer extends MCPServerConfig {
  savedAt: string;
  enabled?: boolean;
}

export interface MCPServerStorage {
  servers: SavedMCPServer[];
  addServer: (server: MCPServerConfig) => void;
  removeServer: (serverId: string) => void;
  toggleServer: (serverId: string) => void;
  isServerSaved: (serverId: string) => boolean;
  getEnabledServers: () => SavedMCPServer[];
  enabledServers: SavedMCPServer[];
}
