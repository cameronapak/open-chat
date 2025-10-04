'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, type FormEvent, Fragment } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type DynamicToolUIPart } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
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
import { Response } from '@/components/ai-elements/response';
import { Loader } from '@/components/ai-elements/loader';
import { Actions, Action } from '@/components/ai-elements/actions';
import { CopyIcon, RefreshCcwIcon, Settings, Puzzle, Globe, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MCPServerListDialog } from '@/components/mcp-server-list-dialog';
import { useOpenRouterModels, type OpenRouterModel } from '@/lib/openrouter.models';
import { type SavedMCPServer } from '@/lib/mcp-storage';
import { getFavicon } from '@/lib/utils';
import { enableOpenRouterWebSearch, enabledMcpServersAtom, modelAtom } from '@/lib/atoms';
import { useAtom, useAtomValue } from 'jotai';
import { ModeToggle } from '@/components/mode-toggle';
import { type OpenChatComponentProps } from '../types/open-chat-component';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from '@/components/ui/shadcn-io/avatar-group';
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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { sanitizeUrl } from 'strict-url-sanitise';
import { loadApiKey } from '@/lib/keystore';

const formatter = new Intl.NumberFormat("en-US");

// Internal avatar group component
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
      <Avatar key="open-router-web-search" className="flex items-center justify-center size-6 bg-white shadow-sm rounded-sm">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <AvatarGroupTooltip>
          <p>Web Search</p>
        </AvatarGroupTooltip>
      </Avatar>
    );
  }

  enabledServers?.map((server, index) => {
    avatars.push(
      <Avatar key={index} className="size-6 bg-white shadow-sm rounded-sm">
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
  );
}

export const OpenChatComponent: React.FC<OpenChatComponentProps> = (props) => {
  const {
    openRouterModel: initialModel,
    api = import.meta.env.VITE_SERVER_URL + '/api/chat',
    systemPrompt,
    threadId,
    initialMessages = [],
    placeholder = 'Ask OpenChat...',
    className = 'max-w-md mx-auto w-full p-6 relative max-h-dvh',
    height = '100%',
    // tools = { enabled: true },
    // mcpRegistryUrl,
    // userProfile,
    onNewMessage,
    onError,
    onSend,
    renderMessage,
    theme = 'light',
    requireAuth = false,
    allowedModels = [],
  } = props;

  // State management
  const [connected, setConnected] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [model, setModel] = useAtom(modelAtom);
  const [enableWebSearch] = useAtom(enableOpenRouterWebSearch);
  const [error, setError] = useState<string | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const enabledServers = useAtomValue(enabledMcpServersAtom);

  // Keep latest enabled servers in a ref to avoid stale closures during send
  const enabledServersRef = useRef<SavedMCPServer[]>(enabledServers);
  useEffect(() => {
    enabledServersRef.current = enabledServers;
  }, [enabledServers]);

  // Set initial model if provided
  useEffect(() => {
    if (initialModel) {
      setModel(initialModel);
    }
  }, [initialModel, setModel]);

  // Keep a ref of the latest selected model for transport
  const modelRef = useRef<string>(model);
  useEffect(() => {
    modelRef.current = model + (enableWebSearch ? ':online' : '');
  }, [model, enableWebSearch]);

  // Check connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const baseUrl = api.replace('/api/chat', '');
        const res = await fetch(`${baseUrl}/api/oauth/status`, {
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({ connected: false }));
        setConnected(Boolean(data.connected));
        if (requireAuth && !data.connected) {
          setIsOpen(true);
        }
      } catch {
        setConnected(false);
        if (requireAuth) setIsOpen(true);
      }
    };
    checkStatus();
  }, [requireAuth, api]);

  // Model list with filtering
  const { data: modelList, isLoading: modelsLoading, isError: modelsError } = useOpenRouterModels();
  const modelOptions = useMemo<OpenRouterModel[]>(
    () => (modelList || [])
      .filter(m => !allowedModels.length || allowedModels.includes(m.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [modelList, allowedModels]
  );

  // Transport configuration
  const transport = useMemo(() => {
    // Canonicalize URL: remove trailing slash (except bare '/'), drop hash, keep search
    function canonicalizeUrl(u: string | null | undefined): string | null {
      if (!u) return null;
      try {
        const parsed = new URL(u);
        let pathname = parsed.pathname || '';
        if (pathname !== '/' && pathname.endsWith('/')) {
          pathname = pathname.slice(0, -1);
        }
        return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search || ''}`;
      } catch {
        return null;
      }
    }
    const getUrlFromServer = (server: SavedMCPServer): string => {
      const raw = server?.remotes?.find(remote => remote.type === "streamable-http" || remote.type === "http+sse")?.url || "";
      const canonical = canonicalizeUrl(raw);
      return canonical ?? raw;
    };
    // Helpers to read BrowserOAuthClientProvider tokens from localStorage synchronously
    const isHttpsOrLocal = (u: string): boolean => {
      try {
        const parsed = new URL(u);
        return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      } catch {
        return false;
      }
    };
    // Mirrors hashString in BrowserOAuthClientProvider
    const hashString = (str: string): string => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    };
    const tokenKeyForUrl = (u: string): string => `mcp:auth_${hashString(u)}_tokens`;
    const readAccessToken = (u: string): string | undefined => {
      if (typeof window === 'undefined') return undefined;
      const candidates = new Set<string>();
      const canonical = canonicalizeUrl(u);
      const sanitized = sanitizeUrl(u);
      const addWithSlashVariants = (val: string) => {
        candidates.add(val);
        if (val.endsWith('/')) {
          candidates.add(val.slice(0, -1));
        } else {
          candidates.add(`${val}/`);
        }
      };
      if (canonical) addWithSlashVariants(canonical);
      if (sanitized && sanitized !== 'about:blank') addWithSlashVariants(sanitized);
      addWithSlashVariants(u);
      for (const candidate of candidates) {
        if (!isHttpsOrLocal(candidate)) continue;
        try {
          const raw = window.localStorage.getItem(tokenKeyForUrl(candidate));
          if (!raw) continue;
          const parsed = JSON.parse(raw) as { access_token?: string };
          if (parsed?.access_token) return parsed.access_token;
        } catch {
          continue;
        }
      }
      return undefined;
    };

    return new DefaultChatTransport({
      api,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      prepareSendMessagesRequest: async ({ messages, id, body }) => {
        // Use ref to avoid stale values if send happens before React re-memoizes transport
        const currentEnabled = enabledServersRef.current || [];

        const mcpServersData = await Promise.all(
          currentEnabled.map(async (server: SavedMCPServer) => {
            const url = getUrlFromServer(server);
            const accessToken = url ? readAccessToken(url) : undefined;
            let apiKey: string | undefined = undefined;
            if (url) {
              try {
                apiKey = await loadApiKey(url);
              } catch {
                apiKey = undefined;
              }
            }
            const base = {
              id: server.id,
              name: server.name,
              url,
              enabled: server.enabled,
            } as Record<string, any>;
            if (accessToken) {
              base.accessToken = accessToken; // include for backend Authorization header
            }
            if (server.headerScheme) base.headerScheme = server.headerScheme;
            if (apiKey) base.apiKey = apiKey;
            return base;
          })
        );

        return {
          body: {
            ...body,
            id,
            messages,
            model: modelRef.current,
            reasoning: true,
            systemPrompt,
            threadId,
            mcpServers: mcpServersData,
          },
        };
      },
    });
  }, [api, systemPrompt, threadId]);

  // Chat hook
  const {
    messages: rawMessages,
    sendMessage,
    stop,
    status: rawStatus,
  } = useChat({
    transport,
    messages: initialMessages,
  });

  const status = rawStatus;

  // Notify parent of new messages
  useEffect(() => {
    if (onNewMessage && rawMessages.length > initialMessages.length) {
      const lastMessage = rawMessages[rawMessages.length - 1];
      onNewMessage(lastMessage);
    }
  }, [rawMessages, onNewMessage, initialMessages.length]);

  // Handle form submission
  const handleSubmit = useCallback((message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
    if (status === "streaming") {
      stop();
      return;
    }

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) return;

    if (requireAuth && !connected) {
      toast.error("Please connect your OpenRouter account first");
      return;
    }

    if (onSend) {
      onSend(message.text || '');
    }

    sendMessage({
      text: message.text || 'Sent with attachments',
      files: message.files,
    });

    event.currentTarget.reset();
  }, [status, connected, requireAuth, sendMessage, onSend, stop]);

  // Auth handlers
  const handleConnect = useCallback(async () => {
    try {
      setError(null);
      const baseUrl = api.replace('/api/chat', '');
      const res = await fetch(`${baseUrl}/api/oauth/start`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start OAuth');
      }
      const { authUrl } = await res.json();
      if (!authUrl) throw new Error('Missing authUrl');
      window.location.href = authUrl;
    } catch (e: any) {
      const errMsg = e.message || 'Failed to start OAuth';
      setError(errMsg);
      onError?.(new Error(errMsg));
    }
  }, [api, onError]);

  const handleDisconnect = useCallback(async () => {
    try {
      const baseUrl = api.replace('/api/chat', '');
      await fetch(`${baseUrl}/api/oauth/disconnect`, {
        method: 'POST',
        credentials: 'include',
      });
      setConnected(false);
      setError(null);
      setIsOpen(true);
    } catch {
      setConnected(false);
      setIsOpen(true);
    }
  }, [api]);

  const openSettings = () => setIsOpen(true);
  const openMcpDialog = () => setMcpDialogOpen(true);

  const shouldShowAvatarGroup = Boolean(enabledServers.length || enableWebSearch);

  // Render custom message if provided
  const renderMessageContent = useCallback((message: any, part: any, index: number) => {
    if (renderMessage) {
      const customRender = renderMessage(message, part, index);
      if (customRender) return customRender;
    }

    // Default rendering logic (extracted from index.tsx)
    switch (part.type) {
      case 'text':
        return (
          <Fragment key={`${message.id}-${index}`}>
            <Message from={message.role}>
              <MessageContent>
                <Response>{part.text}</Response>
              </MessageContent>
            </Message>
            {message.role === 'assistant' && index === rawMessages.length - 1 && (
              <Actions className="mt-2">
                <Action onClick={() => { }} label="Retry">
                  <RefreshCcwIcon className="size-3" />
                </Action>
                <Action
                  onClick={() => navigator.clipboard.writeText(part.text)}
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
            defaultOpen={false}
            key={`${message.id}-${index}`}
            className="w-full"
            isStreaming={status === 'streaming' && index === message.parts.length - 1 && message.id === rawMessages.at(-1)?.id}
          >
            <ReasoningTrigger />
            <ReasoningContent>{part.text}</ReasoningContent>
          </Reasoning>
        );

      case 'dynamic-tool':
        {
          const toolPart = part as DynamicToolUIPart;
          return (
            <Tool key={`${message.id}-${index}`}>
              <ToolHeader title={toolPart.toolName} state={toolPart.state} />
              <ToolContent>
                <ToolInput input={toolPart.input} />
                <ToolOutput errorText={toolPart.errorText} output={toolPart.output} />
              </ToolContent>
            </Tool>
          );
        }

      default:
        return null;
    }
  }, [renderMessage, rawMessages, status]);

  // Wrap with theme provider if specified
  const content = (
    <TooltipProvider>
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
                  onValueChange={setModel}
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
                        m.id === model ? (
                          <PromptInputModelSelectItem key={m.id} value={m.id}>
                            {m.name}
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
                      <PromptInputModelSelectItem key={model} value={model}>
                        {modelOptions.find((m) => m.id === model)?.name}
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

      <div className={className} style={{ height }}>
        <div className="flex flex-col h-full">
          <Conversation className="h-full">
            <ConversationContent>
              {!connected && !isOpen && requireAuth && (
                <Message from="assistant">
                  <MessageContent>
                    <Response>Please connect your OpenRouter account using the settings to start chatting.</Response>
                  </MessageContent>
                </Message>
              )}

              {rawMessages.map((message) => (
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

                  {message.parts.map((part: any, i: number) =>
                    renderMessageContent(message, part, i)
                  )}
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
                placeholder={requireAuth && !connected ? "Connect OpenRouter first" : placeholder}
                disabled={requireAuth && !connected}
                aria-label="Chat input"
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
                  aria-label="Integrations"
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
                      aria-label="Settings"
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
              <PromptInputSubmit
                disabled={(requireAuth && !connected) || !model}
                status={status || undefined}
                aria-label={status === 'streaming' ? 'Stop' : 'Send'}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </TooltipProvider>
  );

  // Apply theme if needed
  if (theme) {
    return (
      <ThemeProvider defaultTheme={theme} storageKey="open-chat-theme">
        {content}
      </ThemeProvider>
    );
  }

  return content;
};

// Export the component as default for easy importing
export default OpenChatComponent;