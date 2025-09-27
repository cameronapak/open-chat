import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Server, ServerListResponse } from '../../../server/src/lib/mcp-registry/types.zod';
import { useMCPServerStorage, type SavedMCPServer } from '@/lib/mcp-storage';
import { Loader2, Plus, Trash2, ExternalLink } from 'lucide-react';

interface MCPServerListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function MCPServerListDialog({ open, onOpenChange }: MCPServerListDialogProps) {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    servers: savedServers,
    addServer,
    removeServer,
    toggleServer,
    isServerSaved,
    getEnabledServers,
  } = useMCPServerStorage();

  // Type assertion for savedServers since useMCPServerStorage returns SavedMCPServer[]
  const typedSavedServers = savedServers as SavedMCPServer[];

  // Fetch servers when dialog opens
  useEffect(() => {
    if (open) {
      fetchServers();
    }
  }, [open]);

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use backend proxy instead of direct API call
      const response = await fetch(`${API_BASE_URL}/api/registry/servers?limit=50`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ServerListResponse = await response.json();
      // Backend already filters to remote servers, so use directly
      setServers(data.servers);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch MCP servers');
      console.error('Error fetching MCP servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServer = (server: Server) => {
    try {
      // Convert server to config format
      const remote = server.remotes?.[0];
      if (!remote) {
        throw new Error('Server has no remote URLs');
      }

      const serverConfig: SavedMCPServer = {
        id: server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name,
        name: server.name,
        description: server.description,
        version: server.version,
        websiteUrl: server.websiteUrl,
        repository: server.repository,
        packages: server.packages?.map(pkg => ({
          ...pkg,
          environment_variables: pkg.environment_variables?.filter(env => env !== null) || undefined
        })) || undefined,
        remotes: server.remotes?.map(remote => ({
          ...remote,
          headers: remote.headers?.filter(header => header !== null) || undefined
        })) || undefined,
      };

      addServer(serverConfig);
      toast.success(`Saved ${server.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save server');
    }
  };

  const handleRemoveServer = (serverId: string, serverName: string) => {
    removeServer(serverId);
    toast.success(`Removed ${serverName}`);
  };

  const handleToggleServer = (serverId: string, serverName: string) => {
    toggleServer(serverId);
    const server = typedSavedServers.find(s => s.id === serverId);
    if (server) {
      toast.success(`${serverName} ${server.enabled ? 'disabled' : 'enabled'}`);
    }
  };

  const handleRefresh = () => {
    fetchServers();
  };

  // Debug logging for scroll area dimensions
  useEffect(() => {
    const logScrollAreaInfo = () => {
      const dialogContent = document.querySelector('[data-radix-dialog-content]');
      const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');

      if (dialogContent && scrollArea) {
        const dialogRect = dialogContent.getBoundingClientRect();
        const scrollRect = scrollArea.getBoundingClientRect();
        const scrollHeight = scrollArea.scrollHeight;
        const clientHeight = scrollArea.clientHeight;

        console.log('=== ScrollArea Debug Info ===');
        console.log('Dialog height:', dialogRect.height);
        console.log('ScrollArea height:', scrollRect.height);
        console.log('ScrollArea scrollHeight:', scrollHeight);
        console.log('ScrollArea clientHeight:', clientHeight);
        console.log('Can scroll:', scrollHeight > clientHeight);
        console.log('Overflow amount:', scrollHeight - clientHeight);
      }
    };

    // Log on mount and after a short delay to ensure rendering is complete
    const timeoutId = setTimeout(logScrollAreaInfo, 100);

    return () => clearTimeout(timeoutId);
  }, [servers, loading]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid overflow-hidden grid-rows-[auto_auto_1fr] grid-cols-1 max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>MCP Servers</DialogTitle>
          <DialogDescription>
            Browse and manage MCP servers from the registry. Only remote servers are shown.
          </DialogDescription>
          {error && (
            <div className="p-4 border border-red-200 rounded-md bg-red-50">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </DialogHeader>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {savedServers.length} saved servers, {getEnabledServers().length} enabled
            </span>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>

        <ScrollArea className="h-full overflow-y-auto">
          {loading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              {servers.map((server) => {
                const isSaved = isServerSaved(server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name);
                const savedServer = typedSavedServers.find(s => s.id === (server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name));

                return (
                  <Card key={server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name}>
                    <CardHeader className="pb-3 grid grid-cols-1 auto-cols-min">
                      <CardTitle className="text-lg">{server.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {server.description}
                      </CardDescription>
                      <div className="flex items-center gap-2">
                        {server.websiteUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(server.websiteUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {isSaved ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveServer(
                              server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name,
                              server.name
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSaveServer(server)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-2">Remote URLs:</p>
                          <div className="space-y-1">
                            {server.remotes?.map((remote: any, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <Badge variant="secondary">{remote.type}</Badge>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {remote.url}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>

                        {isSaved && (
                          <div className="flex items-center space-x-2 pt-2 border-t">
                            <Checkbox
                              id={`enable-${server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name}`}
                              checked={savedServer?.enabled || false}
                              onCheckedChange={() => handleToggleServer(
                                server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name,
                                server.name
                              )}
                            />
                            <label
                              htmlFor={`enable-${server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Enable this server in chat
                            </label>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}