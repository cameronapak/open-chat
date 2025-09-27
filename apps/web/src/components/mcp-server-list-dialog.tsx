import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Server, ServerListResponse } from '../../../server/src/lib/mcp-registry/types.zod';
import { useMCPServerStorage, type SavedMCPServer } from '@/lib/mcp-storage';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ExternalLink, Puzzle } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  AnimatedDrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from './ui/input';
import { getFavicon } from "@/lib/utils";

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <AnimatedDrawerContent className="grid grid-rows-[auto_1fr_auto] grid-cols-1 max-w-md mx-auto">
        <section className="grid grid-cols-1 p-4">
          <Tabs defaultValue="integrations" className="grid grid-rows-[1fr_auto] gap-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="integrations">
                <Puzzle className="h-4 w-4 mr-1 text-muted-foreground" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="custom">
                <Plus className="h-4 w-4 mr-1 text-muted-foreground" />
                Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="integrations" className="relative grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto">
              {typedSavedServers.length ? (
                <Accordion type="single" collapsible className="w-full">
                  {typedSavedServers.map((savedServer) => {
                    const isFromRegistry = servers.some(server =>
                      (server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name) === savedServer.id
                    )

                    const favicon = getFavicon(savedServer.remotes?.[0].url || "")

                    return (
                      <AccordionItem key={savedServer.id} value={savedServer.id}>
                        <AccordionTrigger className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={favicon}
                              className="h-6 w-6 rounded-full bg-white shadow-sm"
                            />
                            {savedServer.name}
                            {!isFromRegistry && (
                              <Badge variant="secondary">Custom</Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3">
                          <div className="grid grid-cols-1 auto-cols-min gap-2">
                            <p className="text-muted-foreground">
                              {savedServer.description}
                            </p>
                            {/* <div className="flex items-center gap-2">
                            {/ * {savedServer.websiteUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(savedServer.websiteUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )} * /}
                            {/ * <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveServer(savedServer.id, savedServer.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button> * /}
                          </div> */}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <DrawerHeader className="flex flex-col items-center gap-2">
                  <DrawerTitle>Integrations</DrawerTitle>
                  <DrawerDescription>
                    Added integrations will appear here.
                  </DrawerDescription>
                </DrawerHeader>
              )}
            </TabsContent>
            <TabsContent value="custom" className="px-3 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <DrawerHeader>
                  <DrawerTitle>New Integration</DrawerTitle>
                  <DrawerDescription>
                    Add a custom Model Context Protocol server.
                  </DrawerDescription>
                </DrawerHeader>
              </div>
              <div className="flex flex-col gap-4">
                <Input
                  type="text"
                  placeholder="Integration name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <Input
                  type="url"
                  placeholder="https://example.com/mcp"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
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
            </TabsContent>
          </Tabs>
        </section>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </AnimatedDrawerContent>
    </Drawer>
  );
}
