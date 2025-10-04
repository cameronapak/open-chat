'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type FormEvent,
  Fragment,
} from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type DynamicToolUIPart } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './ai-elements/conversation';
import { Message, MessageContent } from './ai-elements/message';
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
} from './ai-elements/prompt-input';
import { Response } from './ai-elements/response';
import { Loader } from './ai-elements/loader';
import { Actions, Action } from './ai-elements/actions';
import {
  CopyIcon,
  RefreshCcwIcon,
  Settings,
  Puzzle,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MCPServerListDialog } from './mcp-server-list-dialog';
import { type SavedMCPServer } from '../lib/mcp-storage';
import { getFavicon } from '../lib/utils';
import { enableOpenRouterWebSearch, enabledMcpServersAtom, modelAtom } from '../lib/atoms';
import { useAtom, useAtomValue } from 'jotai';
import { ModeToggle } from './mode-toggle';
import { type ChatModelOption, type OpenChatComponentProps } from '../types/open-chat-component';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AvatarGroup, AvatarGroupTooltip } from './ui/shadcn-io/avatar-group';
import { Source, Sources, SourcesContent, SourcesTrigger } from './ai-elements/sources';
import { Reasoning, ReasoningContent, ReasoningTrigger } from './ai-elements/reasoning';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from './ai-elements/tool';
import { ThemeProvider } from './theme-provider';
import { TooltipProvider } from './ui/tooltip';
import { sanitizeUrl } from 'strict-url-sanitise';
import { loadApiKey } from '../lib/keystore';

const formatter = new Intl.NumberFormat('en-US');
const costFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

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
      <Avatar
        key="open-router-web-search"
        className="flex items-center justify-center size-6 bg-white shadow-sm rounded-sm"
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <AvatarGroupTooltip>
          <p>Web Search</p>
        </AvatarGroupTooltip>
      </Avatar>,
    );
  }

  enabledServers?.forEach((server, index) => {
    avatars.push(
      <Avatar key={index} className="size-6 bg-white shadow-sm rounded-sm">
        <AvatarImage src={getFavicon(server.remotes?.[0].url || '')} />
        <AvatarFallback>{server.name}</AvatarFallback>
        <AvatarGroupTooltip>
          <p>{server.name}</p>
        </AvatarGroupTooltip>
      </Avatar>,
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
    api,
    systemPrompt,
    threadId,
    initialMessages = [],
    placeholder = 'Ask OpenChat...',
    className = 'max-w-md mx-auto w-full p-6 relative max-h-dvh',
    height = '100%',
    onNewMessage,
    onError,
    onSend,
    renderMessage,
    theme = 'light',
    requireAuth = false,
    allowedModels = [],
    models,
    modelsLoading = false,
    modelsError,
    onModelChange,
  } = props;

  const [connected, setConnected] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [model, setModel] = useAtom(modelAtom);
  const [enableWebSearch] = useAtom(enableOpenRouterWebSearch);
  const [error, setError] = useState<string | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const enabledServers = useAtomValue(enabledMcpServersAtom);

  const enabledServersRef = useRef<SavedMCPServer[]>(enabledServers);
  useEffect(() => {
    enabledServersRef.current = enabledServers;
  }, [enabledServers]);

  useEffect(() => {
    if (initialModel) {
      setModel(initialModel);
    }
  }, [initialModel, setModel]);

  const modelRef = useRef<string>(model);
  useEffect(() => {
    modelRef.current = model + (enableWebSearch ? ':online' : '');
  }, [model, enableWebSearch]);

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

  const modelOptions = useMemo<ChatModelOption[]>(
    () =>
      (models ?? [])
        .filter((m) => !allowedModels.length || allowedModels.includes(m.id))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [models, allowedModels],
  );
  const hasModelSelectionUi = Boolean(modelsLoading || modelsError || modelOptions.length);

  useEffect(() => {
    if (models === undefined) {
      return;
    }
    if (!modelOptions.length) {
      if (model) {
        setModel('');
        onModelChange?.('');
      }
      return;
    }
    if (modelOptions.some((m) => m.id === model)) {
      return;
    }
    const nextModel = modelOptions[0]?.id;
    if (nextModel) {
      setModel(nextModel);
      onModelChange?.(nextModel);
    }
  }, [models, modelOptions, model, setModel, onModelChange]);

  const handleModelSelect = useCallback(
    (value: string) => {
      setModel(value);
      onModelChange?.(value);
    },
    [setModel, onModelChange],
  );

  const transport = useMemo(() => {
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
      const raw =
        server?.remotes?.find(
          (remote) => remote.type === 'streamable-http' || remote.type === 'http+sse',
        )?.url || '';
      const canonical = canonicalizeUrl(raw);
      return canonical ?? raw;
    };

    const isHttpsOrLocal = (u: string): boolean => {
      try {
        const parsed = new URL(u);
        return (
          parsed.protocol === 'https:' ||
          parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1'
        );
      } catch {
        return false;
      }
    };

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
        const currentEnabled = enabledServersRef.current || [];

        const mcpServersData = await Promise.all(
          currentEnabled.map(async (server: SavedMCPServer) => {
            const url = getUrlFromServer(server);
            const accessToken = url ? readAccessToken(url) : undefined;
            let apiKey: string | undefined;
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
              base.accessToken = accessToken;
            }
            if (server.headerScheme) base.headerScheme = server.headerScheme;
            if (apiKey) base.apiKey = apiKey;
            return base;
          }),
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

  const { messages: rawMessages, sendMessage, stop, status: rawStatus } = useChat({
    transport,
    messages: initialMessages,
  });

  const status = rawStatus;

  useEffect(() => {
    if (onNewMessage && rawMessages.length > initialMessages.length) {
      const lastMessage = rawMessages[rawMessages.length - 1];
      onNewMessage(lastMessage);
    }
  }, [rawMessages, onNewMessage, initialMessages.length]);

  const handleSubmit = useCallback(
    (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
      if (status === 'streaming') {
        stop();
        return;
      }

      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) return;

      if (requireAuth && !connected) {
        toast.error('Please connect your OpenRouter account first');
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
    },
    [status, connected, requireAuth, sendMessage, onSend, stop],
  );

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

  const renderMessageContent = useCallback(
    (message: any, part: any, index: number) => {
      if (renderMessage) {
        const customRender = renderMessage(message, part, index);
        if (customRender) return customRender;
      }

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
                  <Action onClick={() => {}} label="Retry">
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
              isStreaming={
                status === 'streaming' &&
                index === message.parts.length - 1 &&
                message.id === rawMessages.at(-1)?.id
              }
            >
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          );

        case 'dynamic-tool': {
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
    },
    [renderMessage, rawMessages, status],
  );

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
                hasModelSelectionUi ? (
                  <>
                    <PromptInputModelSelect
                      onValueChange={handleModelSelect}
                      value={modelOptions.some((m) => m.id === model) ? model : ''}
                      disabled={
                        !connected ||
                        modelsLoading ||
                        Boolean(modelsError) ||
                        !modelOptions.length
                      }
                      open={modelMenuOpen}
                      onOpenChange={setModelMenuOpen}
                    >
                      <PromptInputModelSelectTrigger className="!border !border-solid border-input w-full">
                        <PromptInputModelSelectValue placeholder="Select a model" />
                      </PromptInputModelSelectTrigger>
                      <PromptInputModelSelectContent>
                        {modelOptions.length ? (
                          modelOptions.map((m) => {
                            const promptCost = m.promptCostPerToken;
                            const completionCost = m.completionCostPerToken;
                            return (
                              <PromptInputModelSelectItem key={m.id} value={m.id}>
                                <div className="flex-1 grid grid-cols gap-1">
                                  <p className="w-full">{m.label}</p>
                                  {m.description ? (
                                    <p className="text-xs text-muted-foreground">
                                      {m.description}
                                    </p>
                                  ) : null}
                                  {m.contextLength ? (
                                    <p className="text-xs text-muted-foreground font-mono">
                                      {formatter.format(m.contextLength)} context
                                    </p>
                                  ) : null}
                                  {promptCost !== undefined || completionCost !== undefined ? (
                                    <p className="text-xs text-muted-foreground font-mono">
                                      {promptCost !== undefined
                                        ? `${costFormatter.format(promptCost)} prompt`
                                        : null}
                                      {promptCost !== undefined && completionCost !== undefined ? ' · ' : ''}
                                      {completionCost !== undefined
                                        ? `${costFormatter.format(completionCost)} completion`
                                        : null}
                                    </p>
                                  ) : null}
                                </div>
                              </PromptInputModelSelectItem>
                            );
                          })
                        ) : (
                          <PromptInputModelSelectItem value="no-models" disabled>
                            {modelsLoading ? 'Loading models...' : 'No models available'}
                          </PromptInputModelSelectItem>
                        )}
                      </PromptInputModelSelectContent>
                    </PromptInputModelSelect>
                    {modelsError ? <p className="text-xs text-destructive">{modelsError}</p> : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Provide model options to enable selection in settings.
                  </p>
                )
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

      <MCPServerListDialog open={mcpDialogOpen} onOpenChange={setMcpDialogOpen} />

      <div className={className} style={{ height }}>
        <div className="flex flex-col h-full">
          <Conversation className="h-full">
            <ConversationContent>
              {!connected && !isOpen && requireAuth && (
                <Message from="assistant">
                  <MessageContent>
                    <Response>
                      Please connect your OpenRouter account using the settings to start
                      chatting.
                    </Response>
                  </MessageContent>
                </Message>
              )}

              {rawMessages.map((message) => (
                <div key={message.id}>
                  {message.role === 'assistant' &&
                    message.parts.filter((part: any) => part.type === 'source-url')
                      .length > 0 && (
                      <Sources>
                        <SourcesTrigger
                          count={
                            message.parts.filter((part: any) => part.type === 'source-url')
                              .length
                          }
                        />
                        {message.parts
                          .filter((part: any) => part.type === 'source-url')
                          .map((part: any, i: number) => (
                            <SourcesContent key={`${message.id}-${i}`}>
                              <Source key={`${message.id}-${i}`} href={part.url} title={part.url} />
                            </SourcesContent>
                          ))}
                      </Sources>
                    )}

                  {message.parts.map((part: any, i: number) =>
                    renderMessageContent(message, part, i),
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
                placeholder={requireAuth && !connected ? 'Connect OpenRouter first' : placeholder}
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
                  className={shouldShowAvatarGroup ? 'w-fit px-2 bg-secondary' : ''}
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

  if (theme) {
    return (
      <ThemeProvider defaultTheme={theme} storageKey="open-chat-theme">
        {content}
      </ThemeProvider>
    );
  }

  return content;
};

export default OpenChatComponent;