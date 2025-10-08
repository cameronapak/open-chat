'use client';
import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import OpenChatComponent, {
  useOpenRouterModelOptions,
  useOpenRouterAuth,
  normalizeOpenRouterBaseUrl,
} from '@openchatkit/chat';
import type { UIMessage, UseChatOptions } from "@ai-sdk/react";
import "@openchatkit/chat/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const DEFAULT_AUTH_MESSAGE = "Sign in to OpenRouter to start chatting.";

const WrappedChatbotDemo = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatBotDemo />
    </QueryClientProvider>
  );
}

const ChatBotDemo = () => {
  const baseServerUrl = import.meta.env.VITE_SERVER_URL;
  const normalizedServerUrl = normalizeOpenRouterBaseUrl(baseServerUrl);
  const apiUrl = normalizedServerUrl ? `${normalizedServerUrl}/api/chat` : "/api/chat";
  const lockedModelEnv = import.meta.env.VITE_LOCKED_MODEL;
  const lockedModel = typeof lockedModelEnv === "string" ? lockedModelEnv.trim() : undefined;
  const defaultModel = lockedModel ?? "openai/gpt-5";
  const lockedChatOptions = useMemo(() => {
    if (!lockedModel) return undefined;
    return {
      prepareSendMessagesRequest: ({ body }: { body?: Record<string, unknown> }) => ({
        body: {
          ...(body ?? {}),
          model: lockedModel,
        },
      }),
    };
  }, [lockedModel]) as UseChatOptions<UIMessage> | undefined;
  const shouldFetchModels = !lockedModel;
  const modelsQuery = useOpenRouterModelOptions(normalizedServerUrl, { enabled: shouldFetchModels });
  const modelsErrorValue = shouldFetchModels ? modelsQuery.error : undefined;
  const modelsError = modelsErrorValue
    ? modelsErrorValue instanceof Error
      ? modelsErrorValue.message
      : String(modelsErrorValue)
    : undefined;
  const fetchProps = shouldFetchModels
    ? {
        models: modelsQuery.data,
        modelsLoading: Boolean(modelsQuery.isLoading),
        modelsError,
      }
    : {};
  const {
    authState,
    startAuth,
    isStarting,
    error: authError,
  } = useOpenRouterAuth({
    baseUrl: normalizedServerUrl,
    defaultAuthMessage: DEFAULT_AUTH_MESSAGE,
    pollingIntervalMs: 30000,
  });

  useEffect(() => {
    if (!authError) return;
    console.error("OpenRouter auth error", authError);
  }, [authError]);

  const providerMeta = useMemo(
    () => ({
      name: "OpenRouter",
      webSearchLabel: "OpenRouter Web Search",
      webSearchDescription:
        "Augment responses with OpenRouter's web results for fresher answers.",
      authCTA: (
        <button
          type="button"
          onClick={() => void startAuth()}
          disabled={isStarting}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-muted focus:outline-none focus-visible:ring disabled:opacity-70"
        >
          {isStarting ? "Starting…" : "Sign in"}
        </button>
      ),
    }),
    [isStarting, startAuth],
  );

  return (
    <section className="grid grid-cols-1 h-dvh">
      <OpenChatComponent
        mcpRegistryUrl={import.meta.env.DEV ? "https://mcp-registry.val.run" : "https://registry.modelcontextprotocol.io"}
        // mcpRegistryUrl="https://mcp-subregistry-toolbase-test.gavinching.workers.dev"
        modelId={defaultModel}
        api={apiUrl}
        requireAuth={true}
        authState={authState}
        capabilities={{ webSearch: true }}
        providerMeta={providerMeta}
        placeholder="Ask OpenChat..."
        useChatOptions={lockedChatOptions}
        {...fetchProps}
      />
    </section>
  );
};

export const Route = createFileRoute("/")({
  component: WrappedChatbotDemo,
});
