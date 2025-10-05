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
  Sparkle,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MCPServerListDialog } from './mcp-server-list-dialog';
import { type SavedMCPServer } from '../lib/mcp-storage';
import { getFavicon } from '../lib/utils';
import { enabledMcpServersAtom } from '../lib/atoms';
import { useAtomValue } from 'jotai';
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

type ChatOptions = Parameters<typeof useChat>[0];

const mergeUseChatOptions = (
  defaults: ChatOptions,
  overrides?: ChatOptions,
): ChatOptions => {
  if (!overrides) return defaults;

  const base = { ...defaults } as Record<string, any>;
  const extra = overrides as Record<string, any>;

  const composePrepare = (first?: any, second?: any) => {
    if (typeof first !== 'function') return second ?? first;
    if (typeof second !== 'function') return first;

    return async (args: any) => {
      const firstResult = await first(args);
      const secondResult = await second(args);
      const mergedResult: Record<string, any> = {
        ...(firstResult ?? {}),
        ...(secondResult ?? {}),
      };

      if (firstResult?.headers || secondResult?.headers) {
        mergedResult.headers = {
          ...(firstResult?.headers ?? {}),
          ...(secondResult?.headers ?? {}),
        };
      }

      if (firstResult?.body || secondResult?.body) {
        mergedResult.body = {
          ...(firstResult?.body ?? {}),
          ...(secondResult?.body ?? {}),
        };
      }

      return mergedResult;
    };
  };

  base.prepareSendMessagesRequest = composePrepare(
    base.prepareSendMessagesRequest,
    extra.prepareSendMessagesRequest,
  );

  if (
    extra.prepareReconnectToStreamRequest !== undefined ||
    base.prepareReconnectToStreamRequest !== undefined
  ) {
    base.prepareReconnectToStreamRequest = composePrepare(
      base.prepareReconnectToStreamRequest,
      extra.prepareReconnectToStreamRequest,
    );
  }

  Object.keys(extra).forEach((key) => {
    if (
      key === 'prepareSendMessagesRequest' ||
      key === 'prepareReconnectToStreamRequest'
    ) {
      return;
    }

    const value = extra[key];
    if (value !== undefined) {
      base[key] = value;
    }
  });

  return base as ChatOptions;
};

const DEFAULT_AUTH_MESSAGE = 'Please connect your account to start chatting.';
const formatter = new Intl.NumberFormat('en-US');
const costFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

function IntegrationAvatarGroup({
  enabledServers,
  webSearchActive,
  webSearchLabel,
  webSearchAvatar,
}: {
  enabledServers: SavedMCPServer[];
  webSearchActive: boolean;
  webSearchLabel?: string;
  webSearchAvatar?: React.ReactNode;
}) {
  const avatars: React.ReactElement[] = [];

  if (webSearchActive) {
    avatars.push(
      <Avatar
        key="web-search"
        className="flex items-center justify-center size-6 bg-white shadow-sm rounded-sm"
      >
        <span className="flex items-center justify-center text-muted-foreground">
          {webSearchAvatar ?? <Globe className="h-4 w-4" />}
        </span>
        <AvatarGroupTooltip>
          <p>{webSearchLabel ?? 'Web Search'}</p>
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
    modelId: initialModelId,
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
    useChatOptions,
    authState,
    authMessage: authMessageProp,
    prepareAuthRequest,
    capabilities,
    providerMeta,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [model, setModel] = useState(initialModelId ?? '');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const enabledServers = useAtomValue(enabledMcpServersAtom);
  const authReady = authState?.ready ?? true;
  const authMessage = authMessageProp ?? authState?.message ?? DEFAULT_AUTH_MESSAGE;
  const canUseWebSearch = capabilities?.webSearch === true;
  const [webSearchActive, setWebSearchActive] = useState(false);
  const enabledServersRef = useRef<SavedMCPServer[]>(enabledServers);
  const modelRef = useRef<string>(model);
  const lastPropModelIdRef = useRef<string | undefined>(initialModelId);

  useEffect(() => {
    if (
      initialModelId !== undefined &&
      initialModelId !== lastPropModelIdRef.current
    ) {
      setModel(initialModelId);
      lastPropModelIdRef.current = initialModelId;
    }
  }, [initialModelId]);

  useEffect(() => {
    enabledServersRef.current = enabledServers;
  }, [enabledServers]);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    if (!canUseWebSearch && webSearchActive) {
      setWebSearchActive(false);
    }
  }, [canUseWebSearch, webSearchActive]);

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
    [onModelChange],
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
        const currentEnabled = enabledServersRef.current ?? [];

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

        const mergedBody: Record<string, unknown> = {
          ...(body ?? {}),
          id,
          messages,
        };

        if (modelRef.current) {
          mergedBody.model = modelRef.current;
        }

        if (systemPrompt) {
          mergedBody.systemPrompt = systemPrompt;
        }

        if (threadId) {
          mergedBody.threadId = threadId;
        }

        if (mcpServersData.length) {
          mergedBody.mcpServers = mcpServersData;
        }

        const result: {
          body: Record<string, unknown>;
          headers?: Record<string, string>;
        } = {
          body: mergedBody,
        };

        if (canUseWebSearch) {
          const existingMetadata = result.body.metadata;
          const normalizedMetadata =
            typeof existingMetadata === 'object' && existingMetadata !== null
              ? (existingMetadata as Record<string, unknown>)
              : undefined;

          result.body.metadata = {
            ...(normalizedMetadata ?? {}),
            webSearch: webSearchActive,
          };
        }

        if (prepareAuthRequest) {
          try {
            const authInjection = await prepareAuthRequest();
            if (authInjection?.body) {
              result.body = {
                ...result.body,
                ...authInjection.body,
              };
            }
            if (authInjection?.headers) {
              result.headers = {
                'Content-Type': 'application/json',
                ...authInjection.headers,
              };
            }
          } catch (authError) {
            onError?.(authError instanceof Error ? authError : new Error(String(authError)));
          }
        }

        return result;
      },
    });
  }, [api, systemPrompt, threadId, prepareAuthRequest, onError, canUseWebSearch, webSearchActive]);

  const defaultChatOptions = useMemo<ChatOptions>(() => {
    const base: Record<string, any> = {
      transport,
    };

    if (threadId) {
      base.id = threadId;
    }

    return base as ChatOptions;
  }, [transport, threadId]);

  const mergedChatOptions = useMemo(
    () => mergeUseChatOptions(defaultChatOptions, useChatOptions),
    [defaultChatOptions, useChatOptions],
  );

  const { messages: rawMessages, sendMessage, stop, status: rawStatus } =
    useChat(mergedChatOptions);

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
      const hasAttachments = Boolean(message.files?.length)

      if (!(hasText || hasAttachments)) return;

      if (requireAuth && !authReady) {
        setIsOpen(true);
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
    [status, authReady, requireAuth, sendMessage, onSend, stop],
  );

  const openSettings = () => setIsOpen(true);
  const openMcpDialog = () => setMcpDialogOpen(true);

  const shouldShowAvatarGroup = Boolean(enabledServers.length || (canUseWebSearch && webSearchActive));

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
              Configure your chat preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              {requireAuth && !authReady ? (
                <p className="text-sm text-muted-foreground">{authMessage}</p>
              ) : hasModelSelectionUi ? (
                <>
                  <PromptInputModelSelect
                    onValueChange={handleModelSelect}
                    value={modelOptions.some((m) => m.id === model) ? model : ''}
                    disabled={
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
              )}
              <div className="flex items-center justify-between">
                <span>Dark Mode</span>
                <ModeToggle />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MCPServerListDialog
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
        webSearchEnabled={canUseWebSearch ? webSearchActive : undefined}
        onWebSearchToggle={canUseWebSearch ? setWebSearchActive : undefined}
        webSearchLabel={providerMeta?.webSearchLabel}
        webSearchDescription={providerMeta?.webSearchDescription}
        webSearchAvatar={providerMeta?.brandingAvatar}
      />

      <div className={className} style={{ height }}>
        <div className="flex flex-col h-full">
          <Conversation className="h-full">
            <ConversationContent>
              {requireAuth && !authReady && !isOpen && (
                <Message from="assistant">
                  <MessageContent>
                    <Response>{authMessage}</Response>
                    {providerMeta?.authCTA ? (
                      <div className="mt-3">{providerMeta.authCTA}</div>
                    ) : null}
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
                placeholder={
                  requireAuth && !authReady ? authMessage : placeholder
                }
                disabled={requireAuth && !authReady }
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
                        webSearchActive={webSearchActive}
                        webSearchLabel={providerMeta?.webSearchLabel}
                        webSearchAvatar={providerMeta?.brandingAvatar}
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
                      aria-label="AI model selector"
                    >
                      <Sparkle className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">model Selector</span>        
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Model Selector</p>
                  </TooltipContent>
                </Tooltip>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={(requireAuth && !authReady) || !model}
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