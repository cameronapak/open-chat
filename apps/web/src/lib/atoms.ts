import { atom } from "jotai";
import { atomWithStorage } from 'jotai/utils';

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

export const enableOpenRouterWebSearch = atomWithStorage('enableWebSearch', false);
const MCP_STORAGE_KEY = 'openchat:savedMCPServers';

// Create a Jotai atom with localStorage persistence
export const mcpServersAtom = atomWithStorage<SavedMCPServer[]>(MCP_STORAGE_KEY, []);
export const enabledMcpServersAtom = atom<SavedMCPServer[]>(
  (get) => {
    const servers = get(mcpServersAtom);
    const enabledServers = servers.filter(server => server.enabled);
    return enabledServers.filter(server => server.remotes?.find(r => r.type === "streamable-http" || r.type === "sse"))
  }
);

const MODEL_STORAGE_KEY = 'openchat:selectedModel';
export const modelAtom = atomWithStorage<string>(MODEL_STORAGE_KEY, "openai/gpt-5");
