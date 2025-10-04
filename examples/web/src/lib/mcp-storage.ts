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

// Client-side auth metadata (no secrets stored here)
export type HeaderScheme = 'authorization-bearer' | 'x-api-key';

export interface SavedMCPServer extends MCPServerConfig {
  savedAt: string;
  enabled?: boolean;
  // Client-only preferences/indicators:
  // Preferred auth for this server in the client UI/workflow
  authPreference?: 'oauth' | 'api-key';
  // Header scheme to use when sending API keys (if authPreference='api-key')
  headerScheme?: HeaderScheme;
  // Indicator that an API key exists for this server (session or encrypted at rest)
  hasStoredKey?: boolean;
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
