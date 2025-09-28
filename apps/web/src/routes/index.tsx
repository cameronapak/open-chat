'use client';
import { type JSX } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { getFavicon } from "@/lib/utils";
import { Actions, Action } from '@/components/ai-elements/actions';
import { Fragment, useState, useEffect, useMemo, useRef, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings, ExternalLink, Puzzle, Globe } from 'lucide-react';
import { MCPServerListDialog } from '@/components/mcp-server-list-dialog';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type DynamicToolUIPart, type ToolUIPart, type UITool, type UIToolInvocation } from 'ai';
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { isUIResource, UIResourceRenderer, type UIActionResult, basicComponentLibrary, remoteTextDefinition, remoteButtonDefinition } from '@mcp-ui/client';
import { Response } from '@/components/ai-elements/response';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { useOpenRouterModels, type OpenRouterModel } from '@/lib/openrouter.models';
import { useMCPServerStorage, type SavedMCPServer } from '@/lib/mcp-storage';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from '@/components/ui/shadcn-io/avatar-group';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { enableOpenRouterWebSearch } from '@/lib/atoms';
import { useAtom } from 'jotai';
import { ModeToggle } from '@/components/mode-toggle';

const MODEL_STORAGE_KEY = 'openchat:selectedModel';
const formatter = new Intl.NumberFormat("en-US");

interface UIResource {
  type: 'resource';
  resource: {
    uri: string;       // e.g., ui://component/id
    mimeType: 'text/html' | 'text/uri-list' | 'application/vnd.mcp-ui.remote-dom'; // text/html for HTML content, text/uri-list for URL content, application/vnd.mcp-ui.remote-dom for remote-dom content (Javascript)
    text?: string;      // Inline HTML, external URL, or remote-dom script
    blob?: string;      // Base64-encoded HTML, URL, or remote-dom script
  };
}

function IntegrationAvatarGroup({
  enabledServers,
  webSearchEnabled,
}: {
  enabledServers: SavedMCPServer[];
  webSearchEnabled: boolean;
}) {
  const avatars: React.ReactElement[] = [];

  if (webSearchEnabled) {
    avatars.push(
      <Avatar key="open-router-web-search" className="flex items-center justify-center size-6 bg-white border">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <AvatarGroupTooltip>
          <p>Web Search</p>
        </AvatarGroupTooltip>
      </Avatar>
    )
  }

  enabledServers?.map((server, index) => {
    avatars.push(
      <Avatar key={index} className="size-6 bg-white border">
        <AvatarImage src={getFavicon(server.remotes?.[0].url || "")} />
        <AvatarFallback>{server.name}</AvatarFallback>
        <AvatarGroupTooltip>
          <p>{server.name}</p>
        </AvatarGroupTooltip>
      </Avatar>
    );
  });

  if (!avatars.length) {
    return null;
  }

  return (
    <AvatarGroup variant="motion" className="h-12 -space-x-3">
      {avatars}
    </AvatarGroup>
  )
}

const ChatBotDemo = () => {
  const [connected, setConnected] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [model, setModel] = useState<string>("");
  const [enableWebSearch] = useAtom(enableOpenRouterWebSearch);
  const [error, setError] = useState<string | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const {
    enabledServers,
  } = useMCPServerStorage()

  // Load saved model choice on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODEL_STORAGE_KEY);
      if (stored) {
        setModel(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Keep a ref of the latest selected model so the transport can always read it
  const modelRef = useRef<string>(model);
  useEffect(() => {
    modelRef.current = model + (enableWebSearch ? ':online' : '');
  }, [model, enableWebSearch]);

  // Persist model choice whenever it changes
  useEffect(() => {
    try {
      if (model) {
        localStorage.setItem(MODEL_STORAGE_KEY, model);
      }
    } catch {
      // ignore storage errors
    }
  }, [model]);

  // Fetch available models via TanStack Query + localStorage TTL cache
  const { data: modelList, isLoading: modelsLoading, isError: modelsError } = useOpenRouterModels();
  const modelOptions = useMemo<OpenRouterModel[]>(
    () => (modelList || []).sort((a, b) => a.name.localeCompare(b.name)),
    [modelList],
  );

  const selectedModel = useMemo<OpenRouterModel | undefined>(() => modelOptions.find(modelOption => modelOption.id === model as string), [modelOptions, model])

  // If current model is not in the available list, fall back to a sensible default
  useEffect(() => {
    if (!modelOptions.length) return;

    try {
      const stored = localStorage.getItem(MODEL_STORAGE_KEY);
      if (stored && modelOptions.find((m) => m.id === stored)) {
        setModel(stored);
      } else {
        setModel('openai/gpt-4o');
      }
    } catch {
      setModel('openai/gpt-4o');
    }
  }, [modelOptions]);

  // On load, check server connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/oauth/status`, {
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({ connected: false }));
        setConnected(Boolean(data.connected));
        setIsOpen(!data.connected);
      } catch {
        setConnected(false);
        setIsOpen(true);
      }
    };
    checkStatus();
  }, []);

  const transport = useMemo(
    () => {
      return new DefaultChatTransport({
        api: `${import.meta.env.VITE_SERVER_URL}/api/chat`,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: () => {
          return {
            // https://openrouter.ai/announcements/introducing-web-search-via-the-api
            // @TODO - support SSE
            model: modelRef.current,
            reasoning: true,
            mcpServers: enabledServers.map(server => ({
              id: server.id,
              name: server.name,
              url: server?.remotes?.find(r => r.type === "streamable-http")?.url,
              enabled: true
            })),
          };
        },
      });
    },
    [enabledServers],
  );

  const shouldShowAvatarGroup = Boolean(enabledServers.length || enableWebSearch)

  const { messages: rawMessages, sendMessage, status: rawStatus } = useChat({
    transport,
  });

  const messages = [...rawMessages];
  const status = rawStatus;

  // Connect using server-initiated PKCE start
  const handleConnect = async () => {
    try {
      setError(null);
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/oauth/start`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start OAuth');
      }
      const { authUrl } = await res.json();
      if (!authUrl) {
        throw new Error('Missing authUrl');
      }
      window.location.href = authUrl;
    } catch (e: any) {
      setError(e.message || 'Failed to start OAuth');
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${import.meta.env.VITE_SERVER_URL}/api/oauth/disconnect`, {
        method: 'POST',
        credentials: 'include',
      });
      setConnected(false);
      setError(null);
      setIsOpen(true);
    } catch {
      // best-effort
      setConnected(false);
      setIsOpen(true);
    }
  };

  const openSettings = () => setIsOpen(true);
  const openMcpDialog = () => setMcpDialogOpen(true);

  const handleSubmit = (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    if (!connected) {
      return;
    }

    sendMessage({
      text: message.text || 'Sent with attachments',
      files: message.files,
    });

    // Reset the form to clear the textarea without rerendering the parent
    event.currentTarget.reset();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your OpenRouter account and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="space-y-4">
              {connected ? (
                <PromptInputModelSelect
                  onValueChange={(value) => {
                    console.log(value)
                    if (value) {
                      setModel(value);
                    }
                  }}
                  value={model}
                  disabled={!connected || modelsLoading || modelsError}
                  open={modelMenuOpen}
                  onOpenChange={setModelMenuOpen}
                >
                  <PromptInputModelSelectTrigger className="!border !border-solid border-input w-full">
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  {modelMenuOpen ? (
                    <PromptInputModelSelectContent>
                      {modelOptions.map((m) => (
                        m.id === selectedModel?.id ? (
                          <PromptInputModelSelectItem key={model || "openai/gpt-4o"} value={model || "openai/gpt-4o"}>
                            {selectedModel?.name || "openai/gpt-4o"}
                          </PromptInputModelSelectItem>
                        ) : (
                          <PromptInputModelSelectItem key={m.id} value={m.id}>
                            <div className="flex-1 grid grid-cols gap-1">
                              <p className="w-full">{m.name}</p>
                              {m.context_length ? <p className="text-xs text-muted-foreground font-mono">{formatter.format(m.context_length)} context</p> : null}
                              {m.pricing?.completion ? <p className="text-xs text-muted-foreground font-mono">{`\$${m.pricing?.completion || "0.00"}`}</p> : null}
                            </div>
                          </PromptInputModelSelectItem>
                        )
                      ))}
                    </PromptInputModelSelectContent>
                  ) : (
                    <PromptInputModelSelectContent>
                      <PromptInputModelSelectItem key={model || "openai/gpt-4o"} value={model || "openai/gpt-4o"}>
                        {selectedModel?.name || "openai/gpt-4o"}
                      </PromptInputModelSelectItem>
                    </PromptInputModelSelectContent>
                  )}
                </PromptInputModelSelect>
              ) : (
                <Button onClick={handleConnect} className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Get Started with OpenRouter
                </Button>
              )}
              <div className="flex items-center justify-between">
                <span>Dark Mode</span>
                <ModeToggle />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-end space-x-2">
            {connected && (
              <Button variant="destructive" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MCPServerListDialog
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
      />

      <div className="max-w-md mx-auto p-6 relative size-full h-screen">
        <div className="flex flex-col h-full">
          <Conversation className="h-full">
            <ConversationContent>
              {!connected && !isOpen && (
                <Message from="assistant">
                  <MessageContent>
                    <Response>Please connect your OpenRouter account using the settings to start chatting.</Response>
                  </MessageContent>
                </Message>
              )}
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === 'assistant' && message.parts.filter((part: any) => part.type === 'source-url').length > 0 && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.parts.filter(
                            (part: any) => part.type === 'source-url',
                          ).length
                        }
                      />
                      {message.parts.filter((part: any) => part.type === 'source-url').map((part: any, i: number) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source
                            key={`${message.id}-${i}`}
                            href={part.url}
                            title={part.url}
                          />
                        </SourcesContent>
                      ))}
                    </Sources>
                  )}
                  {message.parts.map((part: any, i: number) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <Fragment key={`${message.id}-${i}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                <Response>
                                  {part.text}
                                </Response>
                              </MessageContent>
                            </Message>
                            {message.role === 'assistant' && i === messages.length - 1 && (
                              <Actions className="mt-2">
                                <Action
                                  onClick={() => { }}
                                  label="Retry"
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </Action>
                                <Action
                                  onClick={() =>
                                    navigator.clipboard.writeText(part.text)
                                  }
                                  label="Copy"
                                >
                                  <CopyIcon className="size-3" />
                                </Action>
                              </Actions>
                            )}
                          </Fragment>
                        );
                      case 'reasoning':
                        return (
                          <Reasoning
                            key={`${message.id}-${i}`}
                            className="w-full"
                            isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        );
                      case 'dynamic-tool':
                        const toolPart = part as DynamicToolUIPart;
                        console.log(message);
                        return (
                          <Tool key={`${message.id}-${i}`}>
                            <ToolHeader title={toolPart.toolName} state={toolPart.state} />
                            <ToolContent>
                              <ToolInput input={toolPart.input} />
                              <ToolOutput errorText={toolPart.errorText} output={toolPart.output} />
                            </ToolContent>
                          </Tool>
                        )
                      case 'resource':
                        if (part.resource && (part.resource as UIResource["resource"]).uri?.startsWith('ui://')) {
                          const resourceData = part.resource as UIResource["resource"];
                          const uiResource = { type: 'resource' as const, resource: resourceData };
                          if (isUIResource(uiResource)) {
                            const isRemoteDom = resourceData.mimeType?.startsWith('application/vnd.mcp-ui.remote-dom');
                            return (
                              <UIResourceRenderer
                                key={`${message.id}-${i}`}
                                resource={resourceData}
                                supportedContentTypes={['rawHtml', 'externalUrl', 'remoteDom']}
                                htmlProps={{
                                  iframeProps: {
                                    className: "w-full max-w-[80%] rounded-xl border-2 min-h-[200px]"
                                  },
                                  autoResizeIframe: {
                                    height: true,
                                  }
                                }}
                                remoteDomProps={isRemoteDom ? {
                                  library: basicComponentLibrary,
                                  remoteElements: [remoteTextDefinition, remoteButtonDefinition],
                                } : undefined}
                                onUIAction={async (result: UIActionResult) => {
                                  switch (result.type) {
                                    case 'tool':
                                      // @TODO - Forward tool call to backend via new message
                                      toast.info(result.payload.toolName);
                                      break;
                                    case 'prompt':
                                      // @TODO - implement prompt
                                      toast.info(result.payload.prompt);
                                      break;
                                    case 'notify':
                                      // @TODO - implement notify
                                      toast(result.payload.message);
                                      break;
                                    case 'link':
                                      window.open(result.payload.url, '_blank');
                                      break;
                                    case 'intent':
                                      // @TODO - implement intent
                                      console.log('Intent:', result.payload.intent, result.payload.params);
                                      toast(`Intent: ${result.payload.intent}`);
                                      break;
                                  }
                                  return { status: 'handled' };
                                }}
                              />
                            );
                          }
                        }

                        return (
                          <Message from={message.role} key={`${message.id}-${i}`}>
                            <MessageContent>
                              <p className="text-muted-foreground">Unsupported resource type</p>
                            </MessageContent>
                          </Message>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              ))}
              {status === 'submitted' && <Loader />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <PromptInput onSubmit={handleSubmit} globalDrop multiple>
            <PromptInputBody>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <PromptInputTextarea
                className="transition-none"
                placeholder={!connected ? "Connect OpenRouter first" : undefined}
                disabled={!connected}
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className={shouldShowAvatarGroup ? "w-fit px-2 bg-secondary" : ""}
                  onClick={openMcpDialog}
                >
                  <div>
                    {shouldShowAvatarGroup ? (
                      <IntegrationAvatarGroup
                        enabledServers={enabledServers}
                        webSearchEnabled={enableWebSearch}
                      />
                    ) : (
                      <Puzzle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">Integrations</span>
                  </div>
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={openSettings}
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              </PromptInputTools>
              <PromptInputSubmit disabled={!connected || !model} status={status || undefined} />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute("/")({
  component: ChatBotDemo,
});