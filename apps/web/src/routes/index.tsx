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

import { useOpenRouterModels, type OpenRouterModel } from '@/lib/openrouter.models';

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
    modelRef.current = model + (webSearch ? ':online' : '');
  }, [model, webSearch]);

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

  // Create transport once; the body callback reads the latest model from the ref
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${import.meta.env.VITE_SERVER_URL}/api/chat`,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: () => ({
          // https://openrouter.ai/announcements/introducing-web-search-via-the-api
          model: modelRef.current,
        }),
      }),
    [],
  );

  const { messages: rawMessages, sendMessage: rawSendMessage, status: rawStatus } = useChat({
    transport,
  });

  // @TODO - Test these more examples for MCP UI - https://mcp-aharvard.netlify.app/

  const exampleMCPUIMessage = {
    id: crypto.randomUUID(),
    role: "assistant" as "assistant" | "user" | "system",
    parts: [
      {
        type: 'resource',
        resource: {
          uri: 'ui://mcp-aharvard/weather-card',
          mimeType: 'text/html',
          text: `<style> * { box-sizing: border-box; } :root { font-family: Inter, sans-serif; font-feature-settings: 'liga' 1, 'calt' 1; /* fix for Chrome */ --card-background-color: #000000; --card-text-color: #ffffff; } @supports (font-variation-settings: normal) { :root { font-family: InterVariable, sans-serif; } } html, body { overflow: hidden; } body { margin: 0; padding: 0; background-color: transparent; display: grid; } .mcp-ui-container{ // max-width: 700px; container-type: inline-size; container-name: weather-card; } .weather-card { margin: 10px; position: relative; color: var(--card-text-color); padding: 30px 30px 40px 30px; border-radius: 4px; box-shadow: 0 0 0 10px rgba(255, 255, 255, .15); display: grid; gap: 8px; grid-template-columns: 1fr; overflow: hidden; grid-template-areas: "location" "temperature" "condition-container " } .weather-card * { margin: 0; line-height: 1; } .location { font-size: 48px; font-weight: 700; grid-area: location; } .temperature { grid-area: temperature; display: flex; align-items: top; margin-bottom: 15px; } .temperature-value { font-weight: 900; font-size: 30cqw; line-height: 0.8; transform: translateY(10px); filter: drop-shadow(0 2px 1px rgba(120, 120, 120, 0.25)); } .temperature-unit { font-size: 30px; margin-top: 8px; } .weather-condition-container{ text-transform: uppercase; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; align-self: flex-end; display: flex; flex-direction: column; gap: 6px; grid-area: condition-container; } .condition { font-size: 18px; font-weight: 800; margin-bottom: 4px; } .wind-speed, .humidity { font-size: 14px; font-weight: 2500; letter-spacing: 0.05em; opacity: 0.75; } /* Rotating gradient animation using pseudo-element */ @keyframes rotateGradient { 0% { transform: rotate(-60deg); scale: 1; } 100% { transform: rotate(0deg); scale: 1.5; } } /* Pseudo-element for animated gradient background */ .weather-card::before { content: ''; position: absolute; --size: 200%; top: -50cqw; left: calc(50% - var(--size) / 2); width: var(--size); aspect-ratio: 1/1; transform-origin: center; z-index: -1; background: linear-gradient(135deg, var(--gradient-color-1), var(--gradient-color-2), var(--gradient-color-3)); animation: rotateGradient 3s ease-in-out infinite alternate; } /* Clear and Sunny Conditions */ .weather-condition-clear-sky { --gradient-color-1: #1e90ff; --gradient-color-2: #00bfff; --gradient-color-3: #87ceeb; --card-text-color: #e6f3ff; } .weather-condition-mainly-clear { --gradient-color-1: #87ceeb; --gradient-color-2: #b0e0e6; --gradient-color-3: #f0f8ff; --card-text-color: #1a3c4a; } .weather-condition-partly-cloudy { --gradient-color-1: #87ceeb; --gradient-color-2: #b0e0e6; --gradient-color-3: #f0f8ff; --card-text-color: #1a3c4a; } .weather-condition-overcast { --gradient-color-1: #708090; --gradient-color-2: #778899; --gradient-color-3: #b0c4de; --card-text-color: #e8f0f8; } /* Fog Conditions */ .weather-condition-fog { --gradient-color-1: #d3d3d3; --gradient-color-2: #e6e6e6; --gradient-color-3: #f5f5f5; --card-text-color: #2d2d2d; } .weather-condition-depositing-rime-fog { --gradient-color-1: #d3d3d3; --gradient-color-2: #e6e6e6; --gradient-color-3: #f5f5f5; --card-text-color: #2d2d2d; } /* Drizzle Conditions */ .weather-condition-light-drizzle { --gradient-color-1: #5f9ea0; --gradient-color-2: #7fb3d3; --gradient-color-3: #b0e0e6; --card-text-color: #e6f7ff; } .weather-condition-moderate-drizzle { --gradient-color-1: #5f9ea0; --gradient-color-2: #7fb3d3; --gradient-color-3: #b0e0e6; --card-text-color: #e6f7ff; } .weather-condition-dense-drizzle { --gradient-color-1: #5f9ea0; --gradient-color-2: #7fb3d3; --gradient-color-3: #b0e0e6; --card-text-color: #e6f7ff; } .weather-condition-light-freezing-drizzle { --gradient-color-1: #4682b4; --gradient-color-2: #5f9ea0; --gradient-color-3: #b0c4de; --card-text-color: #e6f3ff; } .weather-condition-dense-freezing-drizzle { --gradient-color-1: #4682b4; --gradient-color-2: #5f9ea0; --gradient-color-3: #b0c4de; --card-text-color: #e6f3ff; } /* Rain Conditions */ .weather-condition-slight-rain { --gradient-color-1: #4682b4; --gradient-color-2: #5f9ea0; --gradient-color-3: #87ceeb; --card-text-color: #e6f3ff; } .weather-condition-moderate-rain { --gradient-color-1: #4682b4; --gradient-color-2: #5f9ea0; --gradient-color-3: #87ceeb; --card-text-color: #e6f3ff; } .weather-condition-heavy-rain { --gradient-color-1: #191970; --gradient-color-2: #4169e1; --gradient-color-3: #1e90ff; --card-text-color: #e6f3ff; } .weather-condition-light-freezing-rain { --gradient-color-1: #4682b4; --gradient-color-2: #5f9ea0; --gradient-color-3: #b0c4de; --card-text-color: #e6f3ff; } .weather-condition-heavy-freezing-rain { --gradient-color-1: #4682b4; --gradient-color-2: #5f9ea0; --gradient-color-3: #b0c4de; --card-text-color: #e6f3ff; } /* Snow Conditions */ .weather-condition-slight-snow { --gradient-color-1: #f0f8ff; --gradient-color-2: #e6e6fa; --gradient-color-3: #ffffff; --card-text-color: #1a1a2e; } .weather-condition-moderate-snow { --gradient-color-1: #f0f8ff; --gradient-color-2: #e6e6fa; --gradient-color-3: #ffffff; --card-text-color: #1a1a2e; } .weather-condition-heavy-snow { --gradient-color-1: #f0f8ff; --gradient-color-2: #e6e6fa; --gradient-color-3: #ffffff; --card-text-color: #1a1a2e; } .weather-condition-snow-grains { --gradient-color-1: #f0f8ff; --gradient-color-2: #e6e6fa; --gradient-color-3: #ffffff; --card-text-color: #1a1a2e; } /* Rain Showers */ .weather-condition-slight-rain-showers { --gradient-color-1: #4682b4; --gradient-color-2: #5f9ea0; --gradient-color-3: #87ceeb; --card-text-color: #e6f3ff; } .weather-condition-moderate-rain-showers { --gradient-color-1: #4682b4; --gradient-color-2: #5f9ea0; --gradient-color-3: #87ceeb; --card-text-color: #e6f3ff; } .weather-condition-violent-rain-showers { --gradient-color-1: #191970; --gradient-color-2: #4169e1; --gradient-color-3: #1e90ff; --card-text-color: #e6f3ff; } /* Snow Showers */ .weather-condition-slight-snow-showers { --gradient-color-1: #f0f8ff; --gradient-color-2: #e6e6fa; --gradient-color-3: #ffffff; --card-text-color: #1a1a2e; } .weather-condition-heavy-snow-showers { --gradient-color-1: #f0f8ff; --gradient-color-2: #e6e6fa; --gradient-color-3: #ffffff; --card-text-color: #1a1a2e; } /* Thunderstorm Conditions */ .weather-condition-slight-thunderstorm { --gradient-color-1: #2f2f2f; --gradient-color-2: #4b0082; --gradient-color-3: #8a2be2; --card-text-color: #f0e6ff; } .weather-condition-thunderstorm-with-slight-hail { --gradient-color-1: #483d8b; --gradient-color-2: #6a5acd; --gradient-color-3: #9370db; --card-text-color: #f0e6ff; } .weather-condition-thunderstorm-with-heavy-hail { --gradient-color-1: #483d8b; --gradient-color-2: #6a5acd; --gradient-color-3: #9370db; --card-text-color: #f0e6ff; } @container weather-card (min-width: 600px) { .weather-card { grid-template-columns: 1fr auto; grid-template-areas: "location temperature" "condition-container temperature " } .temperature { justify-content: flex-end; margin-bottom: 0px; } .temperature-value { font-size: 20cqw; } } </style> <article class="mcp-ui-container"> <div class="weather-card weather-condition-mainly-clear"> <p class="location">Los Angeles</p> <p class="temperature"> <span class="temperature-value">67</span> <span class="temperature-unit">°F</span> </p> <div class="weather-condition-container"> <p class="condition">Mainly Clear</p> <p class="wind-speed"> <span class="wind-speed-value">6</span> <span class="wind-speed-unit">mph</span> <span class="wind-speed-label">Winds</span> </p> <p class="humidity"> <span class="humidity-value">92%</span> <span class="humidity-label">Humidity</span> </p> </div> </div> </article> <script> const mcpUiContainer = document.querySelector('.mcp-ui-container'); function postSize() { const height = mcpUiContainer.scrollHeight; const width = mcpUiContainer.scrollWidth; window.parent.postMessage( { type: "ui-size-change", payload: { height: height, width: width, }, }, "*", ); console.log('posting size', height, width); } const resizeObserver = new ResizeObserver((entries) => { for (const entry of entries) { // Post size whenever document size changes postSize(); } }); resizeObserver.observe(mcpUiContainer); </script> <script> const link = document.createElement('link'); link.rel = 'preconnect'; link.href = 'https://rsms.me/'; document.head.appendChild(link); const link2 = document.createElement('link'); link2.rel = 'stylesheet'; link2.href = 'https://rsms.me/inter/inter.css'; document.head.appendChild(link2); </script>`,
        }
      }
    ],
  };

  const exampleMCPUIiFrameMessage = {
    id: crypto.randomUUID(),
    role: "assistant" as "assistant" | "user" | "system",
    parts: [
      {
        type: 'resource',
        resource: {
          uri: 'ui://example/raw-html',
          mimeType: 'text/uri-list',
          text: `https://app.fetch.bible`,
        }
      }
    ],
  };

  const messages = [exampleMCPUIMessage, exampleMCPUIiFrameMessage, ...rawMessages];

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
                  <PromptInputModelSelectTrigger className="w-full">
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
                      case 'resource':
                        if (part.resource && (part.resource as any).uri?.startsWith('ui://')) {
                          const resourceData = part.resource as any;
                          const uiResource = { type: 'resource' as const, resource: resourceData };
                          if (isUIResource(uiResource)) {
                            const isRemoteDom = resourceData.mimeType?.startsWith('application/vnd.mcp-ui.remote-dom');
                            return (
                              <UIResourceRenderer
                                key={`${message.id}-${i}`}
                                resource={resourceData}
                                supportedContentTypes={['rawHtml', 'externalUrl', 'remoteDom']}
                                htmlProps={{
                                  style: {
                                    width: '100%',
                                    border: '2px solid var(--border)',
                                    borderRadius: '0.625rem',
                                    overflow: 'hidden',
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
                                      // Forward tool call to backend via new message
                                      sendMessage({
                                        role: 'user',
                                        content: [
                                          { type: 'text', text: `Execute tool: ${result.payload.toolName} with params: ${JSON.stringify(result.payload.params)}` }
                                        ]
                                      });
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
                {/* <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu> */}
                <PromptInputButton
                  variant={webSearch ? 'default' : 'ghost'}
                  onClick={() => setWebSearch(!webSearch)}
                  disabled={!connected}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
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