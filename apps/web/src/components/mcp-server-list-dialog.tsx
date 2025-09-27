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
  DrawerContent,
  // DrawerDescription,
  DrawerFooter,
  // DrawerHeader,
  // DrawerTitle,
  // DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  // CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
      <DrawerContent className="grid grid-rows-[auto_1fr_auto] grid-cols-1 max-w-md mx-auto">
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
              <div
                id="scroll-gradient-top"
                className="from-background pointer-events-none sticky top-0 right-0 left-0 z-20 h-6 w-full bg-gradient-to-b to-transparent"
              >
              </div>
              {typedSavedServers.map((savedServer) => {
                const isFromRegistry = servers.some(server =>
                  (server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name) === savedServer.id
                )
                return (
                  <Card key={savedServer.id} className="py-3">
                    <CardHeader className="px-3 grid grid-cols-1 auto-cols-min">
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
                        {/* <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => handleRemoveServer(savedServer.id, savedServer.name)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button> */}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}

              {typedSavedServers.map((savedServer) => {
                const isFromRegistry = servers.some(server =>
                  (server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name) === savedServer.id
                )
                return (
                  <Card key={savedServer.id} className="py-3">
                    <CardHeader className="px-3 grid grid-cols-1 auto-cols-min">
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
                        {/* <Button
                         variant="destructive"
                         size="sm"
                         onClick={() => handleRemoveServer(savedServer.id, savedServer.name)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button> */}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
              <div
                id="scroll-gradient-bottom"
                className="from-background pointer-events-none sticky right-0 bottom-0 left-0 z-20 h-6 w-full bg-gradient-to-t to-transparent"
              >
              </div>
            </TabsContent>
            <TabsContent value="custom">
              <Card>
                <CardHeader>
                  <CardTitle>New Integration</CardTitle>
                  <CardDescription>
                    Add a custom Model Context Protocol server.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
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
                </CardContent>
              </Card>

            </TabsContent>
          </Tabs>
        </section>
        <DrawerFooter>
          {/* <Button>Submit</Button> */}
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
    // <Dialog open={open} onOpenChange={onOpenChange}>
    //   <DialogContent className="grid overflow-hidden grid-rows-[auto_auto_1fr] grid-cols-1 max-h-[80vh]">
    //     <DialogHeader>
    //       <DialogTitle>
    //         <Puzzle className="inline-block text-muted-foreground align-baseline h-4 w-4 mr-1" />
    //         Connectors
    //       </DialogTitle>

    //       {/* Custom Server Form */}
    //       <div className="space-y-3 mt-2 p-4 border rounded-lg bg-muted/50">
    //         <h4 className="text-sm font-medium">Add Custom Server</h4>
    //         <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
    //           <input
    //             type="text"
    //             placeholder="Server name"
    //             value={customName}
    //             onChange={(e) => setCustomName(e.target.value)}
    //             className="px-3 py-2 border rounded-md text-sm"
    //           />
    //           <input
    //             type="url"
    //             placeholder="Server URL"
    //             value={customUrl}
    //             onChange={(e) => setCustomUrl(e.target.value)}
    //             className="px-3 py-2 border rounded-md text-sm"
    //           />
    //           <Button
    //             onClick={handleAddCustomServer}
    //             disabled={!customName.trim() || !customUrl.trim()}
    //             size="sm"
    //           >
    //             <Plus className="h-4 w-4 mr-1" />
    //             Add
    //           </Button>
    //         </div>
    //       </div>

    //       {error && (
    //         <div className="p-4 border border-red-200 rounded-md bg-red-50">
    //           <p className="text-red-600 text-sm">{error}</p>
    //         </div>
    //       )}
    //     </DialogHeader>

    //     <div className="flex items-center justify-between">
    //       <div className="flex items-center gap-2">
    //         <span className="text-sm text-muted-foreground">
    //           {savedServers.length} saved servers, {getEnabledServers().length} enabled
    //         </span>
    //       </div>

    //       <Button
    //         onClick={handleRefresh}
    //         disabled={loading}
    //         variant="outline"
    //         size="sm"
    //       >
    //         {loading ? (
    //           <Loader2 className="h-4 w-4 animate-spin" />
    //         ) : (
    //           'Refresh'
    //         )}
    //       </Button>
    //     </div>

    //     <section className="overflow-y-auto flex flex-col gap-2">
    //       <>
    //         {/* Show saved servers first (including custom ones) */}
    //         {typedSavedServers.map((savedServer) => {
    //           const isFromRegistry = servers.some(server =>
    //             (server._meta?.['io.modelcontextprotocol.registry/official']?.serverId || server.name) === savedServer.id
    //           );

    //           return (
    //             <Card key={savedServer.id}>
    //               <CardHeader className="grid grid-cols-1 auto-cols-min">
    //                 <CardTitle className="text-lg flex items-center gap-2">
    //                   {savedServer.name}
    //                   {!isFromRegistry && (
    //                     <Badge variant="outline" className="text-xs">Custom</Badge>
    //                   )}
    //                 </CardTitle>
    //                 <CardDescription className="mt-1">
    //                   {savedServer.description}
    //                 </CardDescription>
    //                 <div className="flex items-center gap-2">
    //                   {savedServer.websiteUrl && (
    //                     <Button
    //                       variant="ghost"
    //                       size="sm"
    //                       onClick={() => window.open(savedServer.websiteUrl, '_blank')}
    //                     >
    //                       <ExternalLink className="h-4 w-4" />
    //                     </Button>
    //                   )}
    //                   {/* <Button
    //                     variant="destructive"
    //                     size="sm"
    //                     onClick={() => handleRemoveServer(savedServer.id, savedServer.name)}
    //                   >
    //                     <Trash2 className="h-4 w-4" />
    //                   </Button> */}
    //                 </div>
    //               </CardHeader>
    //             </Card>
    //           );
    //         })}

    //         {/* Show message if no servers */}
    //         {!loading && servers.length === 0 && typedSavedServers.length === 0 && (
    //           <div className="text-center py-8 text-muted-foreground">
    //             <p>No servers available. Add a custom server above or check back later.</p>
    //           </div>
    //         )}
    //       </>
    //     </section>
    //   </DialogContent>
    // </Dialog>
  );
}
