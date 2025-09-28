import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMCPServerStorage, type SavedMCPServer } from '@/lib/mcp-storage';
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
import { enableOpenRouterWebSearch } from '@/lib/atoms';
import { useAtom } from 'jotai';

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
        <AccordionTrigger className="px-3 py-3" asChild>
          <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2">
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
            <AccordionTrigger className="px-3 py-3" asChild>
              <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2">
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

export function MCPServerListDialog({ open, onOpenChange }: MCPServerListDialogProps) {
  const {
    servers: savedServers,
    addServer,
    removeServer,
    toggleServer,
  } = useMCPServerStorage();

  const handleAddCustomServer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = e.currentTarget["integration-name"].value;
    const url = e.currentTarget.url.value;
    const description = e.currentTarget.description.value;

    if (!name.trim() || !url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      // Create a simple ID from the name
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

      addServer(customServer);
      toast.success("Custom server added successfully")

      e.currentTarget.reset();
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

            <TabsContent value="integrations" className="relative grid grid-cols-1 gap-4">
              {savedServers.length ? null : (
                <DrawerHeader className="flex flex-col items-center gap-2">
                  <DrawerTitle>Integrations</DrawerTitle>
                  <DrawerDescription>
                    Added integrations will appear here.
                  </DrawerDescription>
                </DrawerHeader>
              )}

              <IntegrationsAccordionList
                servers={savedServers} 
                onToggleServer={toggleServer} 
                onRemoveServer={removeServer}
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
                onSubmit={handleAddCustomServer}
                className="flex flex-col gap-4"
              >
                <InputWithLabel
                  id="integration-name"
                  required
                  label="Integration name"
                  type="text"
                  placeholder="Notion MCP"
                  name="integration-name"
                />
                <InputWithLabel
                  id="url"
                  required
                  label="URL"
                  type="url"
                  placeholder="https://example.com/mcp"
                  name="url"
                />
                <InputWithLabel
                  id="description"
                  label="Description (optional)"
                  type="text"
                  placeholder="What does this integration do?"
                  name="description"
                />
                <Button
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
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
      </AnimatedDrawerContent>
    </Drawer>
  );
}
