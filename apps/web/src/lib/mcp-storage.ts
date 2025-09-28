import { useState, useEffect } from 'react';
import type { Server } from '../../../server/src/lib/mcp-registry/types.zod';

const MCP_STORAGE_KEY = 'openchat:savedMCPServers';

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
  getEnabledServers: () => MCPServerConfig[];
}

/**
 * Hook for managing saved MCP servers in localStorage
 */
export function useMCPServerStorage(): MCPServerStorage {
  const [servers, setServers] = useState<SavedMCPServer[]>([]);

  // Load saved servers on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MCP_STORAGE_KEY);
      if (stored) {
        const parsedServers = JSON.parse(stored);
        setServers(parsedServers);
      }
    } catch (error) {
      console.error('Failed to load saved MCP servers:', error);
      setServers([]);
    }
  }, []);

  // Save servers to localStorage whenever they change
  const saveServers = (newServers: SavedMCPServer[]) => {
    try {
      localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(newServers));
      setServers(newServers);
    } catch (error) {
      console.error('Failed to save MCP servers:', error);
    }
  };

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
      saveServers(updatedServers);
    } else {
      // Add new server
      const newServer: SavedMCPServer = {
        ...server,
        savedAt: new Date().toISOString(),
      };
      saveServers([...servers, newServer]);
    }
  };

  const removeServer = (serverId: string) => {
    const filteredServers = servers.filter(s => s.id !== serverId);
    saveServers(filteredServers);
  };

  const toggleServer = (serverId: string) => {
    const updatedServers = servers.map(server =>
      server.id === serverId
        ? { ...server, enabled: !server.enabled }
        : server
    );
    saveServers(updatedServers);
  };

  const isServerSaved = (serverId: string): boolean => {
    return servers.some(s => s.id === serverId);
  };

  const getEnabledServers = (): MCPServerConfig[] => {
    return servers
      .filter(server => server.enabled)
      .map(({ savedAt, enabled, ...config }) => config);
  };

  return {
    servers,
    addServer,
    removeServer,
    toggleServer,
    isServerSaved,
    getEnabledServers,
  };
}

/**
 * Utility functions for MCP server storage
 */
export const mcpStorage = {
  /**
   * Get all saved servers from localStorage
   */
  getSavedServers(): SavedMCPServer[] {
    try {
      const stored = localStorage.getItem(MCP_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Save servers to localStorage
   */
  saveServers(servers: SavedMCPServer[]): void {
    try {
      localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(servers));
    } catch (error) {
      console.error('Failed to save MCP servers:', error);
    }
  },

  /**
   * Get only enabled servers
   */
  getEnabledServers(): MCPServerConfig[] {
    const servers = this.getSavedServers();
    return servers
      .filter(server => server.enabled && server.remotes?.find(r => r.type === "streamable-http"))
      .map(({ savedAt, enabled, ...config }) => config);
  },

  /**
   * Clear all saved servers
   */
  clearAllServers(): void {
    try {
      localStorage.removeItem(MCP_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear MCP servers:', error);
    }
  },
};
