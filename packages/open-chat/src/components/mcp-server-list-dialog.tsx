import { Fragment, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { type SavedMCPServer } from '@/lib/mcp-storage';
import { Plus, Puzzle, Globe, Trash } from 'lucide-react';
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
import { useEffect, useRef, useState } from 'react';
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

interface MCPServerListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
  webSearchLabel?: string;
  webSearchDescription?: string;
  webSearchAvatar?: ReactNode;
}

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

  // Controlled Tabs so we can switch to "integrations" after success
  const [tab, setTab] = useState<'integrations' | 'custom'>('integrations');

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
      // Clear pending if any (though disable shouldn't have it)
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

  const pendingUrl = pendingServer?.remotes?.find(r => r.type === 'streamable-http' || r.type === 'http+sse')?.url || '';

  console.log('pendingUrl:', pendingUrl); // Log pendingUrl

  return (
    <Drawer open={open} onOpenChange={(isOpen: boolean) => {
      if (!isOpen) {
        setTab('integrations');
      }
      onOpenChange(isOpen);
    }}>
      <AnimatedDrawerContent aria-describedby='integrations' className="grid grid-rows-[auto_1fr_auto] grid-cols-1 max-w-md mx-auto">
        <section className="h-full overflow-hidden grid grid-cols-1 p-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'integrations' | 'custom')} className="h-full overflow-hidden grid grid-rows-[1fr_auto] gap-4">
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

            <TabsContent value="integrations" className="relative h-full overflow-y-auto grid grid-cols-1 gap-4">
              {savedServers.length ? (
                // Fixes: "`DialogContent` requires a `DialogTitle` for
                // the component to be accessible for screen reader users."
                <VisuallyHidden.Root>
                  <DrawerHeader id='integrations' className="flex flex-col items-center gap-2">
                    <DrawerTitle>Integrations</DrawerTitle>
                    <DrawerDescription>
                      Added integrations will appear here.
                    </DrawerDescription>
                  </DrawerHeader>
                </VisuallyHidden.Root>
              ) : (
                <DrawerHeader id='integrations' className="flex flex-col items-center gap-2">
                  <DrawerTitle>Integrations</DrawerTitle>
                  <DrawerDescription>
                    Added integrations will appear here.
                  </DrawerDescription>
                </DrawerHeader>
              )}

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
            <TabsContent value="custom" className="h-full overflow-y-auto px-3 grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-2">
                <DrawerHeader>
                  <DrawerTitle>New Integration</DrawerTitle>
                  <DrawerDescription className='text-balance'>
                    Add a custom Model Context Protocol server.
                  </DrawerDescription>
                </DrawerHeader>
              </div>
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
        </section>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>

        {/* details fetching is now handled by MCPServerDetails via Suspense/use() */}

        {/* Hidden tester mounts when testing starts */}
        {pendingServer ? (
          <McpConnectionTester
            url={pendingUrl}
            onReady={async () => {
              // Save API key (if configured) now that connection is ready
              try {
                if (pendingUrl && apiKeyInput.trim()) {
                  await saveApiKey(pendingUrl, apiKeyInput.trim(), !sessionOnly);
                }
              } catch {
                // swallow; user can retry saving key later
              }
              // Save server with hasStoredKey indicator (session or stored)
              const keyPresence = pendingUrl ? getApiKeyPresenceLabel(pendingUrl) : 'none';
              const withKeyFlag: SavedMCPServer = {
                ...pendingServer,
                hasStoredKey: keyPresence !== 'none',
              };
              setSavedServers(prev => [...prev, withKeyFlag]);
              toast.success('Custom server added and connected');
              formRef.current?.reset?.()
              // Reset auth UI state (keep sensible defaults)
              setApiKeyInput('')
              setSessionOnly(false)
              setTab('integrations')
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
              console.log('authRedirectUrl set to:', manualUrl); // Log authRedirectUrl
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
      </AnimatedDrawerContent>
    </Drawer>
  );
}