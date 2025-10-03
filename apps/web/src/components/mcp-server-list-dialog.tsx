import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { type SavedMCPServer } from '@/lib/mcp-storage';
import { Plus, Trash2, Puzzle, Globe } from 'lucide-react';
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
import { InputWithLabel } from './ui/input';
import { getFavicon } from "@/lib/utils";
import { Switch } from './ui/switch';
import { enableOpenRouterWebSearch, mcpServersAtom, mcpServerDetailsAtom } from '@/lib/atoms';
import { useAtom } from 'jotai';
import { VisuallyHidden } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { useMcp } from '@/hooks/use-mcp';
import MCPServerDetails from './mcp-server-details';
import { saveApiKey, getApiKeyPresenceLabel } from "@/lib/keystore";
import type { HeaderScheme } from "@/lib/keystore";
import type { HeaderScheme as StorageHeaderScheme } from '@/lib/mcp-storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';

interface MCPServerListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function IntegrationsAccordionList({ servers, onToggleServer, onRemoveServer }: {
  servers: SavedMCPServer[],
  onToggleServer: (serverId: string) => void,
  onRemoveServer: (serverId: string) => void,
  testingServerIds?: string[],
  connectedServerIds?: string[],
}) {
  const [enableWebSearch, setEnableWebSearch] = useAtom(enableOpenRouterWebSearch);

  const handleRemoveServer = (serverId: string, serverName: string) => {
    const confirmed = confirm(`Do you want to delete ${serverName} integration?`);
    if (confirmed) {
      onRemoveServer(serverId);
      toast.info(`Removed ${serverName}`);
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="open-router-online">
        <AccordionTrigger
          className="p-3 items-center"
          asChild
        >
          <div
            className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2"
          >
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white shadow-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              Web Search
            </div>
            <Switch
              className="touch-hitbox"
              onClick={(e) => e.stopPropagation()}
              checked={enableWebSearch}
              onCheckedChange={() => setEnableWebSearch(!enableWebSearch)}
            />
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-3">
          <div className="grid grid-cols-1 auto-cols-min gap-2">
            <p className="text-muted-foreground">
              Get real-time web search results.
              <a
                href="https://openrouter.ai/docs/features/web-search"
                target="_blank"
                className="ml-1 hover:text-primary underline"
              >
                Learn about pricing
              </a>
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      {servers.map((savedServer) => {
        const favicon = getFavicon(savedServer.remotes?.[0].url || "")

        return (
          <AccordionItem key={savedServer.id} value={savedServer.id}>
            <AccordionTrigger
              className="p-3 items-center"
              asChild
            >
              <div
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2"
              >
                <img
                  src={favicon}
                  className="h-6 w-6 rounded-full bg-white shadow-sm"
                />
                <h3>
                  {savedServer.name}
                </h3>
                <Switch
                  className="touch-hitbox"
                  onClick={(e) => e.stopPropagation()}
                  checked={savedServer.enabled}
                  onCheckedChange={() => onToggleServer(savedServer.id)}
                />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <div className="grid grid-cols-1 auto-cols-min gap-2">
                <p className="text-muted-foreground">
                  {savedServer.description}
                </p>
                <Button
                  variant="ghost"
                  className="w-fit -translate-x-1.5 text-muted-foreground"
                  size="sm"
                  onClick={() => handleRemoveServer(savedServer.id, savedServer.name)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Integration
                </Button>

                {/* Details: lazy-load tools/prompts/resources using React Suspense + use() */}
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">Available items</summary>
                  <div className="mt-2">
                    {/* MCPServerDetails is a client component that uses Suspense/use() to fetch and persist details */}
                    <MCPServerDetails
                      url={savedServer.remotes?.find(r => r.type === 'streamable-http' || r.type === 'http+sse')?.url || ''}
                      serverId={savedServer.id}
                    />
                  </div>
                </details>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  )
}

/**
 * Lightweight tester that mounts useMcp against a URL and reports status up.
 */
function McpConnectionTester({
  url,
  onReady,
  onFailed,
}: {
  url: string;
  onReady: (details: { tools?: any[]; resources?: any[]; prompts?: any[]; resourceTemplates?: any[]; serverInfo?: { name?: string; version?: string } }) => void;
  onFailed: (error?: string) => void;
}) {
  const { state, error, disconnect, tools, resources, prompts, resourceTemplates, serverInfo } = useMcp({
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

  useEffect(() => {
    if (!url) return;
    if (state === 'ready') {
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
      onFailed(error);
      disconnect(true);
    }
    // For 'authenticating' / 'pending_auth' we just wait; popup flow will resolve.
  }, [state, error, url, onReady, onFailed, disconnect, tools, resources, prompts, resourceTemplates, serverInfo]);

  return null;
}

export function MCPServerListDialog({ open, onOpenChange }: MCPServerListDialogProps) {
  const [savedServers, setSavedServers] = useAtom(mcpServersAtom);
  const [, setMcpDetails] = useAtom(mcpServerDetailsAtom);

   // (previously had DOM-bridge lazy-loading state; replaced with React Suspense component)

  // Controlled Tabs so we can switch to "integrations" after success
  const [tab, setTab] = useState<'integrations' | 'custom'>('integrations');

  // Testing flow state
  const [testing, setTesting] = useState(false);
  const [pendingServer, setPendingServer] = useState<SavedMCPServer | null>(null);

  // Optimistic enable testing: track multiple servers being tested concurrently
  const [pendingToggleServers, setPendingToggleServers] = useState<Record<string, SavedMCPServer>>({});
  // Track connected servers info: store serverInfo when available
  const [connectedServers, setConnectedServers] = useState<Record<string, { name?: string; version?: string } | true>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  // Auth inputs for "Custom" form
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [headerScheme, setHeaderScheme] = useState<HeaderScheme>('authorization-bearer');
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

      const customServer: SavedMCPServer = {
        id: serverId,
        name: name.trim(),
        description: description.trim() || 'Custom MCP server',
        version: '1.0.0',
        remotes: [{
          type: 'streamable-http',
          url: url.trim()
        }],
        savedAt: new Date().toISOString(),
        enabled: true,
        // Client-only auth metadata (no secrets here)
        headerScheme: headerScheme as StorageHeaderScheme,
        hasStoredKey: !!apiKeyInput.trim(),
      };

      // Start connection test via useMcp
      setPendingServer(customServer);
      setTesting(true);
      setTab('custom');
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
      return;
    }

    // Optimistically enable, then test and revert if it fails
    setSavedServers(prev =>
      prev.map(s => (s.id === serverId ? { ...s, enabled: true } : s)),
    );
    setPendingToggleServers(prev => ({ ...prev, [serverId]: target }));
    // Remove from connected servers while testing
    setConnectedServers(prev => {
      const next = { ...prev };
      delete next[serverId];
      return next;
    });
  };

  const pendingUrl = pendingServer?.remotes?.find(r => r.type === 'streamable-http' || r.type === 'http+sse')?.url || '';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
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
                testingServerIds={Object.keys(pendingToggleServers)}
                connectedServerIds={Object.keys(connectedServers)}
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
                  placeholder="Notion MCP"
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
                    If provided, API key authentication will be used. Leave empty to automatically detect OAuth requirements.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-sm font-medium">Header scheme</label>
                    <Select value={headerScheme} onValueChange={(v) => setHeaderScheme(v as HeaderScheme)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="authorization-bearer">Authorization: Bearer</SelectItem>
                        <SelectItem value="x-api-key">X-API-Key</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                  disabled={testing}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {testing ? 'Adding...' : 'Add'}
                </Button>
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
        {testing && pendingServer ? (
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
              formRef.current?.reset?.();
              // Reset auth UI state (keep sensible defaults)
              setApiKeyInput('');
              setHeaderScheme('authorization-bearer');
              setSessionOnly(false);
              setTab('integrations');
              setTesting(false);
              setPendingServer(null);
            }}
            onFailed={(err) => {
              toast.error(err || 'Failed to connect to server');
              setTesting(false);
              setPendingServer(null);
            }}
          />
        ) : null}
      </AnimatedDrawerContent>
    </Drawer>
  );
}