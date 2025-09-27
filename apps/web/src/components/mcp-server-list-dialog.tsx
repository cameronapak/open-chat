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
import { Loader2, Plus, Trash2, ExternalLink, Puzzle } from 'lucide-react';

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

  // Custom server form state
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');

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
        // Adding cache option to better utilize HTTP caching headers
        const response = await fetch(`${API_BASE_URL}/api/registry/servers?limit=50`, {
          cache: 'default' // Use browser's default caching behavior
        });
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
        savedAt: new Date().toISOString()
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

  const handleAddCustomServer = () => {
    if (!customName.trim() || !customUrl.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      // Create a simple ID from the name
      const serverId = `custom-${customName.toLowerCase().replace(/\s+/g, '-')}`;

      const customServer: SavedMCPServer = {
        id: serverId,
        name: customName.trim(),
        description: 'Custom MCP server',
        version: '1.0.0',
        remotes: [{
          type: 'streamable-http',
          url: customUrl.trim()
        }],
        savedAt: new Date().toISOString(),
        enabled: true
      };

      addServer(customServer);
      toast.success(`Added custom server: ${customName}`);

      // Clear form
      setCustomName('');
      setCustomUrl('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add custom server');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid overflow-hidden grid-rows-[auto_auto_1fr] grid-cols-1 max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            <Puzzle className="inline-block text-muted-foreground align-baseline h-4 w-4 mr-1" />
            Connectors
          </DialogTitle>
          <DialogDescription className="text-balance">
            Browse and manage MCP servers from the registry. Only remote servers are shown.
          </DialogDescription>

          {/* Custom Server Form */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium">Add Custom Server</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Server name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="url"
                placeholder="Server URL"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <Button
                onClick={handleAddCustomServer}
                disabled={!customName.trim() || !customUrl.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

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
              {/* Show saved servers first (including custom ones) */}
              {typedSavedServers.map((savedServer) => {
                const isFromRegistry = servers.some(server =>
                  (server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name) === savedServer.id
                );

                return (
                  <Card key={savedServer.id}>
                    <CardHeader className="pb-3 grid grid-cols-1 auto-cols-min">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {savedServer.name}
                        {!isFromRegistry && (
                          <Badge variant="outline" className="text-xs">Custom</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {savedServer.description}
                      </CardDescription>
                      <div className="flex items-center gap-2">
                        {savedServer.websiteUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(savedServer.websiteUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveServer(savedServer.id, savedServer.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-2">Remote URLs:</p>
                          <div className="space-y-1">
                            {savedServer.remotes?.map((remote: any, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <Badge variant="secondary">{remote.type}</Badge>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {remote.url}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2 border-t">
                          <Checkbox
                            id={`enable-${savedServer.id}`}
                            checked={savedServer.enabled || false}
                            onCheckedChange={() => handleToggleServer(savedServer.id, savedServer.name)}
                          />
                          <label
                            htmlFor={`enable-${savedServer.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Enable this server in chat
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Show registry servers that aren't saved yet */}
              {servers
                .filter(server => !isServerSaved(server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name))
                .map((server) => (
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
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSaveServer(server)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Save
                      </Button>
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
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Show message if no servers */}
              {servers.length === 0 && typedSavedServers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No servers available. Add a custom server above or check back later.</p>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}