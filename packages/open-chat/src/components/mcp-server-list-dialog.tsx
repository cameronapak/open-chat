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
import { type HeaderScheme as StorageHeaderScheme } from '@/lib/mcp-storage';
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
import { AnimatePresence, motion, Transition } from 'motion/react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useMcp } from '@/hooks/use-mcp';
import { saveApiKey, getApiKeyPresenceLabel } from "@/lib/keystore";
import Loader from './loader';
import { VisuallyHidden } from "radix-ui";

interface MCPServerListDialogProps {
  mcpRegistryUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
  webSearchLabel?: string;
  webSearchDescription?: string;
  webSearchAvatar?: ReactNode;
}

function atomWithDebounce<T>(initialValue: T, delay = 150) {
  const currentValueStoreAtom = atom(initialValue);
  const debouncedValueStoreAtom = atom(initialValue);
  const timeoutAtom = atom<ReturnType<typeof setTimeout> | null>(null);

  const writeAtom = atom(null, (get, set, nextValue: T) => {
    const existingTimeout = get(timeoutAtom);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    set(currentValueStoreAtom, nextValue);

    if (delay <= 0) {
      set(debouncedValueStoreAtom, nextValue);
      set(timeoutAtom, null);
      return;
    }

    const timeoutId = setTimeout(() => {
      set(debouncedValueStoreAtom, nextValue);
      set(timeoutAtom, null);
    }, delay);

    set(timeoutAtom, timeoutId);
  });

  const currentValueAtom = atom((get) => get(currentValueStoreAtom));
  const debouncedValueAtom = atom(
    (get) => get(debouncedValueStoreAtom),
    (_get, set, nextValue: T) => set(writeAtom, nextValue),
  );

  return { currentValueAtom, debouncedValueAtom };
}

const {
  currentValueAtom: registrySearchInputAtom,
  debouncedValueAtom: registrySearchValueAtom,
} = atomWithDebounce('', 150);

const SUPPORTED_TRANSPORTS = new Set(['streamable-http', 'sse'] as const);

function getTabIndex(tab: 'connections' | 'custom' | 'explore'): number {
  const tabs = ['connections', 'explore', 'custom'];
  return tabs.indexOf(tab);
}

function compareVersions(a: string, b: string): number {
  const normalize = (value: string) =>
    value
      .replace(/^v/i, '')
      .split(/[\.-]/)
      .map((part) => {
        const parsed = Number.parseInt(part, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
      });

  const left = normalize(a);
  const right = normalize(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff > 0 ? 1 : -1;
    }
  }

  return 0;
}

function pickLatestConnectors(connectors: RegistryConnector[]): RegistryConnector[] {
  const latest = new Map<string, RegistryConnector>();

  connectors.forEach((connector) => {
    const key = connector.name;
    const existing = latest.get(key);
    if (!existing || compareVersions(connector.version, existing.version) > 0) {
      latest.set(key, connector);
    }
  });

  return Array.from(latest.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

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

        if (!savedServer.id) {
          return null
        }

        return (
          <Fragment key={savedServer.id}>
            <ItemGroup>
              <Item>
                <ItemMedia>
                  <Avatar className="rounded-sm shadow">
                    <AvatarImage loading="lazy" src={favicon} className="rounded-sm" />
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
  mcpRegistryUrl = 'https://registry.modelcontextprotocol.io',
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
  const [prevTab, setPrevTab] = useState<'connections' | 'custom' | 'explore'>('connections');

  // Testing flow state
  const [testing, setTesting] = useState(false);
  const [pendingServer, setPendingServer] = useState<SavedMCPServer | null>(null);
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | undefined>(undefined);
  const [pendingSource, setPendingSource] = useState<'custom' | 'explore' | null>(null);

  // Optimistic enable testing: track multiple servers being tested concurrently
  const [pendingToggleServers, setPendingToggleServers] = useState<Record<string, SavedMCPServer>>({});
  // Track connected servers info: store serverInfo when available
  const [, setConnectedServers] = useState<Record<string, { name?: string; version?: string } | true>>({});
  const searchInput = useAtomValue(registrySearchInputAtom);
  const debouncedSearch = useAtomValue(registrySearchValueAtom);
  const setSearchInput = useSetAtom(registrySearchValueAtom);

  const trimmedDebouncedSearch = debouncedSearch.trim();

  const formRef = useRef<HTMLFormElement | null>(null);
  // Auth inputs for "Custom" form
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [sessionOnly, setSessionOnly] = useState<boolean>(false);
  const [registryConnectors, setRegistryConnectors] = useState<RegistryConnector[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [selectedRegistryConnector, setSelectedRegistryConnector] = useState<RegistryConnector | null>(null);
  const [exploreDialogOpen, setExploreDialogOpen] = useState(false);
  const registryRequestIdRef = useRef(0);

  const fetchRegistryServers = useCallback(async (searchValue: string) => {
    const query = searchValue.trim();
    const requestId = registryRequestIdRef.current + 1;
    registryRequestIdRef.current = requestId;

    setRegistryLoading(true);
    setRegistryError(null);
    try {
      const client = new MCPRegistryClient(mcpRegistryUrl);
      const response = await client.server.listServers({
        limit: 100,
        ...(query ? { search: query } : {}),
      }) as ServerListResponse;
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

      if (registryRequestIdRef.current === requestId) {
        setRegistryConnectors(pickLatestConnectors(connectors));
      }
    } catch (error: any) {
      if (registryRequestIdRef.current === requestId) {
        setRegistryError(error?.message ?? 'Failed to load connectors.');
        setRegistryConnectors([]);
      }
    } finally {
      if (registryRequestIdRef.current === requestId) {
        setRegistryLoading(false);
      }
    }
  }, [setRegistryConnectors, setRegistryError, setRegistryLoading]);

  useEffect(() => {
    if (!open || tab !== 'explore') {
      return;
    }
    fetchRegistryServers(debouncedSearch);
  }, [open, tab, debouncedSearch, fetchRegistryServers]);

  useEffect(() => {
    if (!open) {
      setExploreDialogOpen(false);
      setSelectedRegistryConnector(null);
    }
  }, [open]);

  const handleRetryRegistry = useCallback(() => {
    fetchRegistryServers(debouncedSearch);
  }, [fetchRegistryServers, debouncedSearch]);

  const handleSelectConnector = useCallback((connector: RegistryConnector) => {
    setSelectedRegistryConnector(connector);
    setExploreDialogOpen(true);
  }, []);

  const handleSaveConnector = useCallback((connector: RegistryConnector) => {
    console.log('[handleSaveConnector] connector:', connector);
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

    console.log('[handleSaveConnector] prepared savedConnector:', savedConnector);
    setExploreDialogOpen(false);
    setSelectedRegistryConnector(null);
    setPendingServer(savedConnector);
    setPendingSource('explore');
    setTesting(true);
    setAuthRedirectUrl(undefined);
    toast.info(`Connecting to ${connector.name}...`);
  }, [savedServers, setTab]);

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
      console.log('handleAddCustomServer: computedHeaderScheme:', computedHeaderScheme);

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
      console.log('handleAddCustomServer: customServer:', customServer);

      // Start connection test via useMcp
      setPendingServer(customServer);
      setPendingSource('custom');
      setTesting(true);
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
        delete (next)[serverId];
        return next;
      });
      // Clear pending if any (though disable shouldn’t have it)
      setPendingToggleServers(prev => {
        const next = { ...prev };
        delete (next)[serverId];
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
      delete (next)[serverId];
      return next;
    })

    // TODO: Implement tester for existing server toggle (mount McpConnectionTester for this server)
    // For now, clear pending after short delay to allow re-toggle
    setTimeout(() => {
      setPendingToggleServers(prev => {
        const next = { ...prev };
        delete (next)[serverId];
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

  const pendingUrl = (() => {
    const priority = ['streamable-http', 'http+sse', 'sse'];
    const remote = pendingServer?.remotes?.find((r) => priority.includes(r.type));
    return remote?.url ?? '';
  })();

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

  const tabTransition: Transition = {
    duration: 0.3,
    type: "spring",
    bounce: 0.2,
  };

  const tabs = (
    <AnimatedHeight className="max-h-[90svh] overflow-y-auto">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setPrevTab(tab);
          setTab(v as 'connections' | 'custom' | 'explore');
        }}
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

        <AnimatePresence mode="sync" custom={getTabIndex(prevTab) < getTabIndex(tab) ? 1 : -1}>
          <TabsContent value="connections" asChild>
            <motion.div
              key="connections"
              custom={getTabIndex(prevTab) < getTabIndex(tab) ? 1 : -1}
              initial={{ x: getTabIndex(prevTab) < getTabIndex(tab) ? 100 : -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: getTabIndex(prevTab) < getTabIndex(tab) ? -100 : 100, opacity: 0 }}
              transition={tabTransition}
              className="pt-4"
            >
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
            </motion.div>
          </TabsContent>

          <TabsContent value="explore" asChild>
            <motion.div
              key="explore"
              custom={getTabIndex(prevTab) < getTabIndex(tab) ? 1 : -1}
              initial={{ x: getTabIndex(prevTab) < getTabIndex(tab) ? 100 : -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: getTabIndex(prevTab) < getTabIndex(tab) ? -100 : 100, opacity: 0 }}
              transition={tabTransition}
              className="relative grid grid-cols-1 gap-4 pt-4"
            >
              <div className="grid gap-4 mt-4">
                <InputWithLabel
                  id="registry-search"
                  label="Search registry"
                  type="search"
                  placeholder="Search the MCP registry..."
                  autoComplete="off"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <div>
                  {registryLoading ? (
                    <div className="h-full w-full flex items-center justify-center">
                      <Loader />
                    </div>
                  ) : registryError ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-destructive">{registryError}</p>
                      <Button variant="outline" size="sm" onClick={handleRetryRegistry} className="self-start">
                        Retry
                      </Button>
                    </div>
                  ) : registryConnectors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {trimmedDebouncedSearch
                        ? `No connectors found for “${trimmedDebouncedSearch}”. Try a different search.`
                        : 'No connectors available right now. Try again later.'}
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
                                <Avatar className="rounded-sm shadow h-8 w-8">
                                  <AvatarImage loading="lazy" src={getFavicon(connector.remotes[0]?.url ?? '')} className="rounded-sm" />
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
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="custom" asChild>
            <motion.div
              key="custom"
              custom={getTabIndex(prevTab) < getTabIndex(tab) ? 1 : -1}
              initial={{ x: getTabIndex(prevTab) < getTabIndex(tab) ? 100 : -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: getTabIndex(prevTab) < getTabIndex(tab) ? -100 : 100, opacity: 0 }}
              transition={tabTransition}
              className="px-3 grid grid-cols-1 gap-4 pt-8 pb-6"
            >
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
            </motion.div>
          </TabsContent>
        </AnimatePresence>
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
      <VisuallyHidden.Root>
        <DialogHeader>
          <DialogTitle className="text-center">Manage Connections</DialogTitle>
        </DialogHeader>
      </VisuallyHidden.Root>
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
          onReady={async (details) => {
            const serverName = pendingServer?.name ?? 'Server';
            try {
              if (pendingSource === 'custom' && pendingUrl && apiKeyInput.trim()) {
                await saveApiKey(pendingUrl, apiKeyInput.trim(), !sessionOnly);
              }
            } catch {
              console.warn('[McpConnectionTester] Failed to persist API key for', pendingUrl);
            }

            const keyPresence = pendingUrl ? getApiKeyPresenceLabel(pendingUrl) : 'none';
            const serverToSave = pendingServer
              ? {
                ...pendingServer,
                hasStoredKey: keyPresence !== 'none',
                enabled: true,
              }
              : null;

            if (serverToSave) {
              _setMcpDetails((prev) => ({
                ...prev,
                [serverToSave.id]: {
                  tools: details.tools ?? [],
                  resources: details.resources ?? [],
                  resourceTemplates: details.resourceTemplates ?? [],
                  prompts: details.prompts ?? [],
                  serverInfo: details.serverInfo ?? null,
                  lastSeen: new Date().toISOString(),
                },
              }));

              setSavedServers((prev) => {
                const existingIndex = prev.findIndex((s) => s.id === serverToSave.id);
                if (existingIndex >= 0) {
                  const next = [...prev];
                  next[existingIndex] = serverToSave;
                  return next;
                }
                return [...prev, serverToSave];
              });
            }

            toast.success(`${serverName} connected and saved`);
            if (pendingSource === 'custom') {
              formRef.current?.reset?.();
              setApiKeyInput('');
              setSessionOnly(false);
            }
            setTab('connections');
            setTesting(false);
            setAuthRedirectUrl(undefined);
            setPendingServer(null);
            setPendingSource(null);
          }}
          onFailed={(err) => {
            const failedName = pendingServer?.name ?? 'Server';
            toast.error(err ? `${failedName} connection failed: ${err}` : 'Failed to connect to server');
            setTesting(false);
            setAuthRedirectUrl(undefined);
            setPendingServer(null);
            setPendingSource(null);
          }}
          onAuthRedirect={(manualUrl) => {
            console.log('authRedirectUrl set to:', manualUrl);
            setTesting(false);
            setAuthRedirectUrl(manualUrl);
            toast.info(
              manualUrl
                ? 'Complete OAuth in the popup or open the authorization link provided.'
                : 'Complete OAuth in the authorization popup to finish adding this server.',
            );
          }}
        />
      ) : null}
    </>
  );
}