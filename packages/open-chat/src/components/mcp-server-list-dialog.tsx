import { Fragment, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { type SavedMCPServer } from '@/lib/mcp-storage';
import { Plus, Puzzle, Globe, Trash } from 'lucide-react';
import {
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  ResponsiveDialog
} from "@/components/ui/drawer"
import { AnimatedHeight } from '@/components/animate-height';
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { InputWithLabel } from './ui/input';
import { getFavicon } from "@/lib/utils";
import { Switch } from './ui/switch';
import { mcpServersAtom, mcpServerDetailsAtom } from '@/lib/atoms';
import { useAtom } from 'jotai';
import { VisuallyHidden } from 'radix-ui';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useMcp } from '@/hooks/use-mcp';
// import MCPServerDetails from './mcp-server-details';
import { saveApiKey, getApiKeyPresenceLabel } from "@/lib/keystore";
import type { HeaderScheme as StorageHeaderScheme } from '@/lib/mcp-storage';
import { Checkbox } from './ui/checkbox';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { MCPRegistryClient } from 'mcp-registry-spec-sdk'
import type { ServerListResponse } from 'mcp-registry-spec-sdk'

interface MCPServerListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
  webSearchLabel?: string;
  webSearchDescription?: string;
  webSearchAvatar?: ReactNode;
}

const SUPPORTED_TRANSPORTS = new Set(['streamable-http', 'sse'] as const);

type RegistryConnector = {
  id: string;
  name: string;
  description: string;
  version: string;
  websiteUrl?: string;
  status?: string;
  tags?: string[];
  requiresAuth: boolean;
  remotes: NonNullable<SavedMCPServer['remotes']>;
  source: any;
};

function IntegrationsAccordionList({
  servers,
  onToggleServer,
  onRemoveServer,
  webSearchEnabled,
  onWebSearchToggle,
  webSearchLabel,
  webSearchDescription,
  webSearchAvatar,
}: {
  servers: SavedMCPServer[];
  onToggleServer: (serverId: string) => void;
  onRemoveServer: (serverId: string) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
  webSearchLabel?: string;
  webSearchDescription?: string;
  webSearchAvatar?: ReactNode;
}) {
  const renderWebSearchToggle = typeof onWebSearchToggle === 'function';

  const handleRemoveServer = (serverId: string, serverName: string) => {
    const confirmed = confirm(`Do you want to delete ${serverName} integration?`);
    if (confirmed) {
      onRemoveServer(serverId);
      toast.info(`Removed ${serverName}`);
    }
  };

  return (
    <div className='w-full'>
      {renderWebSearchToggle ? (
        <>
          <ItemGroup>
            <Item>
              <ItemMedia>
                <Avatar className="flex items-center justify-center size-8 bg-white shadow-sm rounded-sm">
                  {webSearchAvatar ?? <Globe className="h-6 w-6 text-muted-foreground" />}
                  <span className="sr-only">
                    {webSearchLabel ?? 'Web Search'}
                  </span>
                </Avatar>
              </ItemMedia>
              <ItemContent className="gap-1">
                <ItemTitle>{webSearchLabel ?? 'Web Search'}</ItemTitle>
                <ItemDescription>
                  {webSearchDescription ?? 'Get real-time web search results.'}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Switch
                  className="touch-hitbox"
                  onClick={(e) => e.stopPropagation()}
                  checked={Boolean(webSearchEnabled)}
                  onCheckedChange={(checked) => {
                    console.log(`WebSearch Switch change: checked=${checked}`);
                    onWebSearchToggle?.(checked);
                  }}
                />
              </ItemActions>
            </Item>
          </ItemGroup>
          <ItemSeparator />
        </>
      ) : null}

      {servers.map((savedServer, index) => {
        const favicon = getFavicon(savedServer.remotes?.[0].url || "");

        return (
          <Fragment key={savedServer.id}>
            <ItemGroup>
              <Item>
                <ItemMedia>
                  <Avatar className="rounded-sm shadow">
                    <AvatarImage src={favicon} className="rounded-sm" />
                    <AvatarFallback>{savedServer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent className="gap-1">
                  <ItemTitle>{savedServer.name}</ItemTitle>
                  <ItemDescription>{savedServer.description}</ItemDescription>
                </ItemContent>
                <ItemActions className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveServer(savedServer.id, savedServer.name);
                    }}
                    className="text-muted-foreground"
                  >
                    <Trash />
                  </Button>

                  <Switch
                    className="touch-hitbox"
                    onClick={(e) => e.stopPropagation()}
                    checked={savedServer.enabled}
                    onCheckedChange={(checked) => {
                      console.log(`Switch change for ${savedServer.id}: checked=${checked}`);
                      onToggleServer(savedServer.id);
                    }}
                  />
                </ItemActions>
              </Item>
            </ItemGroup>
            {index !== servers.length - 1 && <ItemSeparator />}
          </Fragment>
        );
      })}
    </div>
  )
}

/**
 * Lightweight tester that mounts useMcp against a URL and reports status up.
 */
function McpConnectionTester({
  url,
  onReady,
  onFailed,
  onAuthRedirect,
}: {
  url: string;
  onReady: (details: { tools?: any[]; resources?: any[]; prompts?: any[]; resourceTemplates?: any[]; serverInfo?: { name?: string; version?: string } }) => void;
  onFailed: (error?: string) => void;
  onAuthRedirect?: (manualUrl?: string) => void;
}) {
  const { state, error, disconnect, tools, resources, prompts, resourceTemplates, serverInfo, authUrl } = useMcp({
    url,
    clientName: 'OpenChat',
    clientUri: typeof window !== 'undefined' ? window.location.origin : '',
    callbackUrl:
      typeof window !== 'undefined'
        ? new URL('/oauth/callback', window.location.origin).toString()
        : '/oauth/callback',
    autoRetry: false,
    preventAutoAuth: false,
  });

  const prevStateRef = useRef(state);
  const awaitingAuthRef = useRef(false);

  useEffect(() => {
    if (!url) return;
    if (state === 'authenticating' && prevStateRef.current !== 'authenticating') {
      awaitingAuthRef.current = true;
      onAuthRedirect?.(authUrl);
    } else if (state === 'ready') {
      if (awaitingAuthRef.current && authUrl) {
        prevStateRef.current = state;
        return;
      }
      awaitingAuthRef.current = false;
      // Provide structured details to the parent
      onReady({
        tools,
        resources,
        prompts,
        resourceTemplates,
        serverInfo,
      });
      // Quiet disconnect to avoid UI flicker
      disconnect(true);
    } else if (state === 'failed') {
      awaitingAuthRef.current = false;
      onFailed(error);
      disconnect(true);
    }
    prevStateRef.current = state;
  }, [state, error, url, onReady, onFailed, disconnect, tools, resources, prompts, resourceTemplates, serverInfo, onAuthRedirect, authUrl]);

  return null;
}

export function MCPServerListDialog({
  open,
  onOpenChange,
  webSearchEnabled,
  onWebSearchToggle,
  webSearchLabel,
  webSearchDescription,
  webSearchAvatar,
}: MCPServerListDialogProps) {
  const [savedServers, setSavedServers] = useAtom(mcpServersAtom);
  const [, _setMcpDetails] = useAtom(mcpServerDetailsAtom);

  // (previously had DOM-bridge lazy-loading state; replaced with React Suspense component)

  // Controlled Tabs so we can switch to "connections" after success
  const [tab, setTab] = useState<'connections' | 'custom' | 'explore'>('connections');

  // Testing flow state
  const [testing, setTesting] = useState(false);
  const [pendingServer, setPendingServer] = useState<SavedMCPServer | null>(null);
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | undefined>(undefined);

  // Optimistic enable testing: track multiple servers being tested concurrently
  const [pendingToggleServers, setPendingToggleServers] = useState<Record<string, SavedMCPServer>>({});
  // Track connected servers info: store serverInfo when available
  const [, setConnectedServers] = useState<Record<string, { name?: string; version?: string } | true>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  // Auth inputs for "Custom" form
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [sessionOnly, setSessionOnly] = useState<boolean>(false);
  const [registryConnectors, setRegistryConnectors] = useState<RegistryConnector[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [selectedRegistryConnector, setSelectedRegistryConnector] = useState<RegistryConnector | null>(null);
  const [exploreDialogOpen, setExploreDialogOpen] = useState(false);
  const registryFetchedRef = useRef(false);
  const registryLoadingRef = useRef(false);

  const fetchRegistryServers = useCallback(async () => {
    if (registryLoadingRef.current) {
      return;
    }
    registryLoadingRef.current = true;
    setRegistryLoading(true);
    setRegistryError(null);
    try {
      const client = new MCPRegistryClient("https://mcp-registry.val.run");
      const response = await client.server.listServers() as ServerListResponse;
      console.log(response)
      const connectors: RegistryConnector[] = response?.servers.map((server) => {
        console.log(server)
        const remotes = server.server.remotes?.filter((remote) => {
          const transport = remote.type;
          console.log(remote);
          return transport && SUPPORTED_TRANSPORTS.has(transport as 'streamable-http' | 'sse') && remote?.url;
        })
          .map((remote) => ({
            type: (remote?.type) as 'streamable-http' | 'sse',
            url: remote.url as string,
          })) || [];

        console.log({
          remotes
        })

        if (!remotes.length) {
          return [];
        }

        const connectorId = `${server?.server.name}-${server?.server.version}` as string | undefined;
        if (!connectorId) {
          return [];
        }

        return [{
          id: connectorId,
          name: (server?.server.name ?? connectorId) as string,
          description: (server?.server.description ?? 'No description available.') as string,
          version: (server?.server.version ?? '0.0.0') as string,
          websiteUrl: server.server.websiteUrl,
          status: server._meta?.['io.modelcontextprotocol.registry/official']?.status,
          remotes,
          requiresAuth: server.server.remotes?.some((remote) => remote.headers?.some((header) => header.name === 'Authorization' || header.isRequired && header.isSecret)) || false,
          source: server,
        } satisfies RegistryConnector];
      }).flat() || [] as RegistryConnector[];

      console.log(connectors)

      setRegistryConnectors(connectors);
      registryFetchedRef.current = true;
    } catch (error: any) {
      setRegistryError(error?.message ?? 'Failed to load connectors.');
    } finally {
      registryLoadingRef.current = false;
      setRegistryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || tab !== 'explore') {
      return;
    }
    if (registryFetchedRef.current) {
      return;
    }
    fetchRegistryServers();
  }, [open, tab, fetchRegistryServers]);

  useEffect(() => {
    if (!open) {
      setExploreDialogOpen(false);
      setSelectedRegistryConnector(null);
    }
  }, [open]);

  const handleRetryRegistry = useCallback(() => {
    registryFetchedRef.current = false;
    fetchRegistryServers();
  }, [fetchRegistryServers]);

  const handleSelectConnector = useCallback((connector: RegistryConnector) => {
    setSelectedRegistryConnector(connector);
    setExploreDialogOpen(true);
  }, []);

  const handleSaveConnector = useCallback((connector: RegistryConnector) => {
    if (!connector.remotes?.length) {
      toast.error('Connector is missing a compatible remote endpoint.');
      return;
    }

    if (savedServers.some((server) => server.id === connector.id)) {
      toast.info(`${connector.name} is already saved.`);
      setExploreDialogOpen(false);
      setSelectedRegistryConnector(null);
      setTab('connections');
      return;
    }

    const savedConnector: SavedMCPServer = {
      id: connector.id,
      name: connector.name,
      description: connector.description,
      version: connector.version,
      remotes: connector.remotes,
      savedAt: new Date().toISOString(),
      enabled: true,
      hasStoredKey: false,
    };

    setSavedServers((prev) => [...prev, savedConnector]);
    toast.success(`Saved ${connector.name}`);
    setExploreDialogOpen(false);
    setSelectedRegistryConnector(null);
    setTab('connections');
  }, [savedServers, setSavedServers]);

  const handleAddCustomServer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = (e.currentTarget as any)["integration-name"].value as string;
    const url = (e.currentTarget as any).url.value as string;
    const description = (e.currentTarget as any).description.value as string;

    if (!name.trim() || !url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      const serverId = crypto.randomUUID();

      const computedHeaderScheme: StorageHeaderScheme =
        apiKeyInput.trim() ? 'x-api-key' : 'authorization-bearer';

      const customServer: SavedMCPServer = {
        id: serverId,
        name: name.trim(),
        description: description.trim() || 'Custom Integration',
        version: '1.0.0',
        remotes: [{
          type: 'streamable-http',
          url: url.trim()
        }],
        savedAt: new Date().toISOString(),
        enabled: true,
        // Client-only auth metadata (no secrets here)
        headerScheme: computedHeaderScheme,
        hasStoredKey: !!apiKeyInput.trim(),
      };

      // Start connection test via useMcp
      setPendingServer(customServer);
      setTesting(true);
      setTab('custom');
      setAuthRedirectUrl(undefined);
      toast.info('Connecting to server (OAuth popup may open)...');
      // Do NOT save yet; we only save on successful connection
    } catch (err: any) {
      toast.error(err.message || 'Failed to add custom server');
    }
  };

  // Handler for toggling an existing saved server (optimistic enable + revert on fail)
  const handleToggleExistingServer = (serverId: string) => {
    const target = savedServers.find(s => s.id === serverId);
    if (!target) return;

    console.log(`Toggle attempt for ${serverId}: enabled=${target.enabled}, pending=${!!pendingToggleServers[serverId]}`);

    // Ignore duplicate toggles for a server already under test
    if (pendingToggleServers[serverId]) return;

    if (target.enabled) {
      // Disabling is immediate
      setSavedServers(prev =>
        prev.map(s => (s.id === serverId ? { ...s, enabled: false } : s)),
      );
      // Remove from connected servers when disabled
      setConnectedServers(prev => {
        const next = { ...prev };
        delete next[serverId];
        return next;
      });
      // Clear pending if any (though disable shouldn’t have it)
      setPendingToggleServers(prev => {
        const next = { ...prev };
        delete next[serverId];
        return next;
      });
      return;
    }

    // Optimistically enable, then test and revert if it fails
    setSavedServers(prev =>
      prev.map(s => (s.id === serverId ? { ...s, enabled: true } : s)),
    );
    setPendingToggleServers(prev => ({ ...prev, [serverId]: target }));
    console.log(`Pending set for ${serverId}`);
    // Remove from connected servers while testing
    setConnectedServers(prev => {
      const next = { ...prev };
      delete next[serverId];
      return next;
    })

    // TODO: Implement tester for existing server toggle (mount McpConnectionTester for this server)
    // For now, clear pending after short delay to allow re-toggle
    setTimeout(() => {
      setPendingToggleServers(prev => {
        const next = { ...prev };
        delete next[serverId];
        console.log(`Pending cleared for ${serverId} after timeout`);
        return next;
      });
    }, 1000);
  };

  const handleRootOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setTab('connections');
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const pendingUrl = pendingServer?.remotes?.find(r => r.type === 'streamable-http' || r.type === 'http+sse')?.url || '';

  const connectorDetailBody = selectedRegistryConnector ? (
    <div className="space-y-4 text-sm text-muted-foreground">
      <div>
        <span className="text-foreground font-medium">Version:</span>{' '}
        {selectedRegistryConnector.version ?? 'Unknown'}
      </div>
      {selectedRegistryConnector.status ? (
        <div>
          <span className="text-foreground font-medium">Status:</span>{' '}
          {selectedRegistryConnector.status}
        </div>
      ) : null}
      {selectedRegistryConnector.websiteUrl ? (
        <div>
          <a
            className="text-primary underline underline-offset-4"
            href={selectedRegistryConnector.websiteUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            Visit website
          </a>
        </div>
      ) : null}
      <div>
        <h4 className="text-sm font-medium text-foreground">Endpoints</h4>
        <ul className="mt-2 space-y-2 break-all">
          {selectedRegistryConnector.remotes.map((remote) => (
            <li key={`${remote.type}-${remote.url}`}>
              <span className="text-foreground font-medium">{remote.type}</span>{' '}
              <span>{remote.url}</span>
            </li>
          ))}
        </ul>
      </div>
      {selectedRegistryConnector.tags?.length ? (
        <div>
          <h4 className="text-sm font-medium text-foreground">Tags</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedRegistryConnector.tags.join(', ')}
          </p>
        </div>
      ) : null}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">
      Select a connector from the list to view details.
    </p>
  );

  const connectorDialog = (
    <ResponsiveDialog
      open={exploreDialogOpen}
      onOpenChange={(nextOpen) => {
        setExploreDialogOpen(nextOpen);
        if (!nextOpen) {
          setSelectedRegistryConnector(null);
        }
      }}
      trigger={<span aria-hidden className="hidden" />}
      dialogContentProps={{ className: "sm:max-w-md" }}
      drawerContentProps={{ className: "max-w-md mx-auto grid grid-rows-[auto_1fr_auto]" }}
      desktop={
        <>
          <DialogHeader>
            <DialogTitle>{selectedRegistryConnector?.name ?? 'Connector details'}</DialogTitle>
            <DialogDescription>{selectedRegistryConnector?.description}</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto max-h-[60vh]">
            {connectorDetailBody}
          </div>
          <DialogFooter>
            <Button
              disabled={!selectedRegistryConnector}
              onClick={() =>
                selectedRegistryConnector && handleSaveConnector(selectedRegistryConnector)
              }
            >
              Save Connector
            </Button>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </>
      }
      mobile={
        <>
          <DrawerHeader>
            <DrawerTitle>{selectedRegistryConnector?.name ?? 'Connector details'}</DrawerTitle>
            <DrawerDescription>{selectedRegistryConnector?.description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {connectorDetailBody}
          </div>
          <DrawerFooter>
            <Button
              disabled={!selectedRegistryConnector}
              onClick={() =>
                selectedRegistryConnector && handleSaveConnector(selectedRegistryConnector)
              }
            >
              Save Connector
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </>
      }
    />
  );

  const tabs = (
    <AnimatedHeight className="max-h-[90svh] overflow-y-auto">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'connections' | 'custom' | 'explore')}
        className="sticky top-0 h-full overflow-hidden grid grid-rows-[auto_1fr] gap-0"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="connections">
            <Puzzle className="h-4 w-4 mr-1 text-muted-foreground" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="explore">
            <Globe className="h-4 w-4 mr-1 text-muted-foreground" />
            Explore
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Plus className="h-4 w-4 mr-1 text-muted-foreground" />
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="relative grid grid-cols-1 gap-4 pt-4">
          {/* {savedServers.length ? (
          <VisuallyHidden.Root>
            <DrawerHeader id='connections' className="flex flex-col items-center gap-2">
              <DrawerTitle>Integrations</DrawerTitle>
              <DrawerDescription>
                Added integrations will appear here.
              </DrawerDescription>
            </DrawerHeader>
          </VisuallyHidden.Root>
        ) : (
          <DrawerHeader id='connections' className="flex flex-col items-center gap-2">
            <DrawerTitle>Integrations</DrawerTitle>
            <DrawerDescription>
              Added integrations will appear here.
            </DrawerDescription>
          </DrawerHeader>
        )} */}

          <IntegrationsAccordionList
            servers={savedServers}
            onToggleServer={handleToggleExistingServer}
            onRemoveServer={(serverId: string) =>
              setSavedServers(prevServers =>
                prevServers.filter(server => server.id !== serverId)
              )
            }
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={onWebSearchToggle}
            webSearchLabel={webSearchLabel}
            webSearchDescription={webSearchDescription}
            webSearchAvatar={webSearchAvatar}
          />
        </TabsContent>

        <TabsContent value="explore" className="relative grid grid-cols-1 gap-4 pt-4">
          {/* <DrawerHeader className="flex flex-col items-center gap-2">
          <DrawerTitle>Explore Connectors</DrawerTitle>
          <DrawerDescription>
            Discover connectors from the MCP registry.
          </DrawerDescription>
        </DrawerHeader> */}
          <div>
            {registryLoading ? (
              <p className="text-sm text-muted-foreground">Loading connectors…</p>
            ) : registryError ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-destructive">{registryError}</p>
                <Button variant="outline" size="sm" onClick={handleRetryRegistry} className="self-start">
                  Retry
                </Button>
              </div>
            ) : registryConnectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {JSON.stringify(registryConnectors)}
                No connectors available right now. Try again later.
              </p>
            ) : (
              <div className="flex flex-col">
                {registryConnectors.map((connector, index) => (
                  <Fragment key={connector.id}>
                    <ItemGroup>
                      <Item
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectConnector(connector)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSelectConnector(connector);
                          }
                        }}
                      >
                        <ItemMedia>
                          <Avatar className="rounded-sm shadow">
                            <AvatarImage src={getFavicon(connector.remotes[0]?.url ?? '')} className="rounded-sm" />
                            <AvatarFallback>{connector.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </ItemMedia>
                        <ItemContent className="gap-1">
                          <ItemTitle className="w-full grid grid-cols-[1fr_auto]">
                            {connector.requiresAuth ? "🔒 " + connector.name : connector.name}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              v{connector.version}
                            </span>
                          </ItemTitle>
                          <ItemDescription>{connector.description}</ItemDescription>
                        </ItemContent>
                      </Item>
                    </ItemGroup>
                    {index !== registryConnectors.length - 1 && <ItemSeparator />}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="px-3 grid grid-cols-1 gap-4 pt-8 pb-6">
          {/* <div className="flex flex-col gap-2">
          <DrawerHeader>
            <DrawerTitle>New Integration</DrawerTitle>
            <DrawerDescription className='text-balance'>
              Add a custom Model Context Protocol server.
            </DrawerDescription>
          </DrawerHeader>
        </div> */}
          <form
            ref={formRef}
            onSubmit={handleAddCustomServer}
            className="flex flex-col gap-4"
          >
            <InputWithLabel
              id="integration-name"
              required
              label="Integration name"
              type="text"
              autoComplete='off'
              placeholder="Notion"
              name="integration-name"
            />
            <InputWithLabel
              id="url"
              required
              autoComplete='off'
              label="URL"
              type="url"
              placeholder="https://example.com/mcp"
              name="url"
            />
            <InputWithLabel
              id="description"
              autoComplete='off'
              label="Description (optional)"
              type="text"
              placeholder="What does this integration do?"
              name="description"
            />
            {/* Auth configuration */}
            <div className="grid grid-cols-1 gap-3">
              <InputWithLabel
                id="api-key"
                autoComplete="off"
                label="API Key (optional)"
                type="password"
                placeholder="Enter API key"
                name="api-key"
                value={apiKeyInput}
                onChange={(e: any) => setApiKeyInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If provided, API key authentication will be used with X-API-Key. Leave empty to use OAuth (Authorization: Bearer) if requested by the server.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="session-only"
                  checked={sessionOnly}
                  onCheckedChange={(checked) => setSessionOnly(!!checked)}
                />
                <label htmlFor="session-only">Session-only (don’t persist)</label>
              </div>
              <p className="text-xs text-muted-foreground">
                API keys are encrypted at rest with Web Crypto (AES-GCM) when persisted. Avoid untrusted scripts (XSS).
              </p>
            </div>
            <Button
              size="sm"
              disabled={Boolean(pendingServer)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {pendingServer
                ? authRedirectUrl
                  ? 'Awaiting OAuth...'
                  : testing
                    ? 'Adding...'
                    : 'Adding...'
                : 'Add'}
            </Button>
            {pendingServer && authRedirectUrl ? (
              <div className="rounded-md border border-dashed border-muted p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Authorization required</p>
                <p className="mt-1">
                  Complete the OAuth step in the popup window. If it did not open, use the link below.
                </p>
                <a
                  className="mt-2 inline-flex items-center text-sm font-medium text-primary underline underline-offset-4"
                  href={authRedirectUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open authorization URL
                </a>
              </div>
            ) : null}
          </form>
        </TabsContent>
      </Tabs>
    </AnimatedHeight>
  );

  const desktopContent = (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">Manage Connections</DialogTitle>
      </DialogHeader>
      <div className="h-[70vh] overflow-hidden">
        <div className="h-full overflow-hidden grid grid-rows-[1fr_auto]">
          {tabs}
          {connectorDialog}
        </div>
      </div>
    </>
  );

  const mobileContent = (
    <>
      <section className="mt-4 h-full overflow-hidden grid grid-cols-1 px-4 pb-4">
        {tabs}
        {connectorDialog}
      </section>
      <DrawerFooter>
        <DrawerClose asChild>
          <Button variant="outline">Close</Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={handleRootOpenChange}
        trigger={<span aria-hidden className="hidden" />}
        dialogContentProps={{ className: "sm:max-w-md" }}
        drawerContentProps={{ className: "grid grid-rows-[auto_1fr_auto]" }}
        desktop={desktopContent}
        mobile={mobileContent}
      />

      {pendingServer ? (
        <McpConnectionTester
          url={pendingUrl}
          onReady={async () => {
            try {
              if (pendingUrl && apiKeyInput.trim()) {
                await saveApiKey(pendingUrl, apiKeyInput.trim(), !sessionOnly);
              }
            } catch {
            }
            const keyPresence = pendingUrl ? getApiKeyPresenceLabel(pendingUrl) : 'none';
            const withKeyFlag: SavedMCPServer = {
              ...pendingServer,
              hasStoredKey: keyPresence !== 'none',
            };
            setSavedServers(prev => [...prev, withKeyFlag]);
            toast.success('Custom server added and connected');
            formRef.current?.reset?.()
            setApiKeyInput('')
            setSessionOnly(false)
            setTab('connections')
            setTesting(false)
            setAuthRedirectUrl(undefined)
            setPendingServer(null)
          }}
          onFailed={(err) => {
            toast.error(err || 'Failed to connect to server')
            setTesting(false)
            setAuthRedirectUrl(undefined)
            setPendingServer(null)
          }}
          onAuthRedirect={(manualUrl) => {
            console.log('authRedirectUrl set to:', manualUrl);
            setTesting(false)
            setAuthRedirectUrl(manualUrl)
            toast.info(
              manualUrl
                ? 'Complete OAuth in the popup or open the authorization link provided.'
                : 'Complete OAuth in the authorization popup to finish adding this server.',
            )
          }}
        />
      ) : null}
    </>
  );
}