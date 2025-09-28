import { useAtom, useAtomValue } from 'jotai';
import { mcpServersAtom, enabledMcpServersAtom } from './atoms';

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

/**
 * Hook for managing saved MCP servers in localStorage
 */
export function useMCPServerStorage(): MCPServerStorage {
  const [servers, setServers] = useAtom(mcpServersAtom);
  const enabledServers = useAtomValue(enabledMcpServersAtom);

  const addServer = (server: MCPServerConfig) => {
    const existingIndex = servers.findIndex(s => s.id === server.id);

    if (existingIndex >= 0) {
      // Update existing server
      const updatedServers = [...servers];
      updatedServers[existingIndex] = {
        ...server,
        description: servers[existingIndex].description,
        savedAt: servers[existingIndex].savedAt,
      };
      setServers(updatedServers);
    } else {
      // Add new server
      const newServer: SavedMCPServer = {
        ...server,
        savedAt: new Date().toISOString(),
      };
      setServers(prevServers => [...prevServers, newServer]);
    }
  };

  const removeServer = (serverId: string) => {
    setServers(prevServers => prevServers.filter(s => s.id !== serverId));
  };

  const toggleServer = (serverId: string) => {
    setServers(prevServers =>
      prevServers.map(server =>
        server.id === serverId
          ? { ...server, enabled: !server.enabled }
          : server
      )
    );
  };

  const isServerSaved = (serverId: string): boolean => {
    return servers.some(s => s.id === serverId);
  };

  const getEnabledServers = (): SavedMCPServer[] => {
    return servers
      .filter(server => server.enabled && server.remotes?.find(r => r.type === "streamable-http"))
      .map(({ savedAt: _savedAt, enabled: _enabled, ...config }) => config as SavedMCPServer);
  };

  return {
    servers,
    addServer,
    removeServer,
    toggleServer,
    isServerSaved,
    enabledServers,
    getEnabledServers,
  };
}
