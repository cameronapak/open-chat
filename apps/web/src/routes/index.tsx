'use client';
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
import { Actions, Action } from '@/components/ai-elements/actions';
import { Fragment, useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, ExternalLink } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Response } from '@/components/ai-elements/response';
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from 'lucide-react';
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

import { useOpenRouterModels, type OpenRouterModel } from '@/lib/openrouter.models';

const MODEL_STORAGE_KEY = 'openchat:selectedModel';
const formatter = new Intl.NumberFormat("en-US");

const ChatBotDemo = () => {
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [model, setModel] = useState<string>("");
  const [webSearch, setWebSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);

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
    modelRef.current = model;
  }, [model]);

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
    () => modelList || [],
    [modelList],
  );

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

  // Create transport once; the body callback reads the latest model from the ref
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${import.meta.env.VITE_SERVER_URL}/api/chat`,
        credentials: 'include',
        body: () => ({ model: modelRef.current }),
      }),
    [],
  );

  const { messages: rawMessages, sendMessage: rawSendMessage, status: rawStatus } = useChat({
    transport,
  });

  const messages = rawMessages;
  const sendMessage = (message: any, options?: any) => {
    if (!connected) {
      console.error('Not connected');
      return;
    }
    return rawSendMessage(message, options);
  };
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

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    if (!connected) {
      return;
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files
      },
      {
        webSearch: webSearch,
      },
    );
    setInput('');
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>OpenRouter Authentication</CardTitle>
              <CardDescription>
                Connect your OpenRouter account to use the chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-4">
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              {connected ? (
                <p className="text-sm text-green-600">Connected to OpenRouter</p>
              ) : (
                <Button onClick={handleConnect} className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect with OpenRouter
                </Button>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              {connected && (
                <Button variant="destructive" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
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
              {messages.map((message: any) => (
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
                                  onClick={() => {}}
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

          <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
            <PromptInputBody>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder={!connected ? "Connect OpenRouter first" : undefined}
                disabled={!connected}
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputButton
                  variant={webSearch ? 'default' : 'ghost'}
                  onClick={() => setWebSearch(!webSearch)}
                  disabled={!connected}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
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
                  <PromptInputModelSelectTrigger>
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  {modelMenuOpen ? (
                    <PromptInputModelSelectContent>
                      {modelOptions.map((m) => (
                        <PromptInputModelSelectItem key={m.id} value={m.id}>
                          <div className="flex flex-col gap-1">
                            <p>{m.name}</p>
                            {m.context_length ? <p className="text-xs text-muted-foreground font-mono">{formatter.format(m.context_length)} context</p> : null}
                          </div>
                        </PromptInputModelSelectItem>
                      ))}
                    </PromptInputModelSelectContent>
                  ) : (
                    <PromptInputModelSelectContent>
                      <PromptInputModelSelectItem key={model || "openai/gpt-4o"} value={model || "openai/gpt-4o"}>
                        {model || "openai/gpt-4o"}  
                      </PromptInputModelSelectItem>
                    </PromptInputModelSelectContent>
                  )}
                </PromptInputModelSelect>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openSettings}
                >
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Button>
              </PromptInputTools>
              <PromptInputSubmit disabled={(!input && !status) || !connected || !model} status={status || undefined} />
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