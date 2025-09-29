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
import { enableOpenRouterWebSearch, mcpServersAtom } from '@/lib/atoms';
import { useAtom } from 'jotai';
import { VisuallyHidden } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { useMcp } from '@/hooks/use-mcp';

interface MCPServerListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// // Backend API base URL
// const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

function IntegrationsAccordionList({ servers, onToggleServer, onRemoveServer }: { servers: SavedMCPServer[], onToggleServer: (serverId: string) => void, onRemoveServer: (serverId: string) => void }) {
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
          className="p-0 pr-3 items-center"
          asChild
        >
          <div
            onClick={e => {
              // Doing this approach makes it where the accordion only
              // opens when the arrow icon button is clicked, not this
              // entire row. 
              e.stopPropagation()
              setEnableWebSearch(prev => !prev)
            }}
            className="p-3 grid w-full grid-cols-[auto_1fr_auto] items-center gap-2"
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
              className="p-0 pr-3 items-center"
              asChild
            >
              <div
                className="p-3 grid w-full grid-cols-[auto_1fr_auto] items-center gap-2"
                onClick={e => {
                  // Doing this approach makes it where the accordion only
                  // opens when the arrow icon button is clicked, not this
                  // entire row. 
                  e.stopPropagation()
                  onToggleServer(savedServer.id)
                }}
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
  onReady: () => void;
  onFailed: (error?: string) => void;
}) {
  const { state, error, disconnect } = useMcp({
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
      onReady();
      // Quiet disconnect to avoid UI flicker
      disconnect(true);
    } else if (state === 'failed') {
      onFailed(error);
      disconnect(true);
    }
    // For 'authenticating' / 'pending_auth' we just wait; popup flow will resolve.
  }, [state, error, url, onReady, onFailed, disconnect]);

  return null;
}

export function MCPServerListDialog({ open, onOpenChange }: MCPServerListDialogProps) {
  const [savedServers, setSavedServers] = useAtom(mcpServersAtom);

  // Controlled Tabs so we can switch to "integrations" after success
  const [tab, setTab] = useState<'integrations' | 'custom'>('integrations');

  // Testing flow state
  const [testing, setTesting] = useState(false);
  const [pendingServer, setPendingServer] = useState<SavedMCPServer | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

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
        enabled: true
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

  const pendingUrl = pendingServer?.remotes?.find(r => r.type === 'streamable-http')?.url || '';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <AnimatedDrawerContent aria-describedby='integrations' className="grid grid-rows-[auto_1fr_auto] grid-cols-1 max-w-md mx-auto">
        <section className="grid grid-cols-1 p-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'integrations' | 'custom')} className="grid grid-rows-[1fr_auto] gap-4">
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

            <TabsContent value="integrations" className="relative grid grid-cols-1 gap-4">
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
                onToggleServer={(serverId: string) => setSavedServers(prevServers =>
                  prevServers.map(server =>
                    server.id === serverId
                      ? { ...server, enabled: !server.enabled }
                      : server
                  )
                )}
                onRemoveServer={(serverId: string) => setSavedServers(prevServers =>
                  prevServers.filter(server => server.id !== serverId)
                )}
              />
            </TabsContent>
            <TabsContent value="custom" className="px-3 grid grid-cols-1 gap-4">
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

        {/* Hidden tester mounts when testing starts */}
        {testing && pendingServer ? (
          <McpConnectionTester
            url={pendingUrl}
            onReady={() => {
              // Save now that connection is ready
              setSavedServers(prev => [...prev, pendingServer]);
              toast.success('Custom server added and connected');
              formRef.current?.reset?.();
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