'use client';
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import OpenChatComponent, {
  useOpenRouterModelOptions,
} from '@faith-tools/open-chat';
import type { UIMessage, UseChatOptions } from "@ai-sdk/react";
import "@faith-tools/open-chat/styles.css";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

const queryClient = new QueryClient();

type AuthStateShape = {
  ready: boolean;
  message?: string;
};

interface AuthStatusResponse {
  connected?: boolean;
  message?: string;
}

const DEFAULT_AUTH_MESSAGE = "Sign in to OpenRouter to start chatting.";
const AUTH_ERROR_MESSAGE = "Unable to verify OpenRouter status. Please try again.";

const WrappedChatbotDemo = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatBotDemo />
    </QueryClientProvider>
  );
}

const ChatBotDemo = () => {
  const baseServerUrl = import.meta.env.VITE_SERVER_URL;
  const normalizedServerUrl =
    typeof baseServerUrl === "string" && baseServerUrl.length > 0
      ? baseServerUrl.replace(/\/$/, "")
      : "";
  const apiUrl = normalizedServerUrl ? `${normalizedServerUrl}/api/chat` : "/api/chat";
  const lockedModelEnv = import.meta.env.VITE_LOCKED_MODEL;
  const lockedModel = typeof lockedModelEnv === "string" ? lockedModelEnv.trim() : undefined;
  const defaultModel = lockedModel ?? "openai/gpt-5";
  const [authState, setAuthState] = useState<AuthStateShape>({
    ready: false,
    message: DEFAULT_AUTH_MESSAGE,
  });
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
  const modelsQuery = shouldFetchModels ? useOpenRouterModelOptions(baseServerUrl) : undefined;
  const modelsErrorValue = modelsQuery?.error;
  const modelsError = modelsErrorValue
    ? modelsErrorValue instanceof Error
      ? modelsErrorValue.message
      : String(modelsErrorValue)
    : undefined;
  const fetchProps = shouldFetchModels
    ? {
        models: modelsQuery?.data,
        modelsLoading: Boolean(modelsQuery?.isLoading),
        modelsError,
      }
    : {};
  const fetchAuthStatus = useCallback(async (): Promise<AuthStatusResponse> => {
    const statusUrl = normalizedServerUrl
      ? `${normalizedServerUrl}/api/oauth/status`
      : "/api/oauth/status";
    try {
      const response = await fetch(statusUrl, {
        credentials: "include",
      });
      const raw = await response.text();
      let payload: Record<string, unknown> = {};
      if (raw) {
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          payload = {};
        }
      }
      if (!response.ok) {
        const statusText = response.statusText?.trim();
        const statusDetails = statusText?.length
          ? `${response.status} ${statusText}`
          : `${response.status}`;
        const baseMessage =
          typeof payload.error === "string"
            ? payload.error
            : typeof payload.message === "string"
              ? payload.message
              : "Unable to verify authentication";
        throw new Error(`${baseMessage} (${statusDetails})`);
      }
      const connectedValue = (payload as { connected?: unknown }).connected;
      const messageValue = (payload as { message?: unknown }).message;
      return {
        connected:
          typeof connectedValue === "boolean" ? connectedValue : Boolean(connectedValue),
        message: typeof messageValue === "string" ? messageValue : undefined,
      };
    } catch (error) {
      console.error("Failed to fetch OpenRouter auth status", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }, [normalizedServerUrl]);
  const authStatusQuery = useQuery<AuthStatusResponse, Error>({
    queryKey: ["openrouter-auth-status", normalizedServerUrl],
    queryFn: fetchAuthStatus,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
  });
  const { refetch: refetchAuthStatus } = authStatusQuery;
  useEffect(() => {
    const data = authStatusQuery.data;
    if (!data) return;
    const nextReady = Boolean(data.connected);
    const nextMessage =
      typeof data.message === "string"
        ? data.message
        : nextReady
          ? undefined
          : DEFAULT_AUTH_MESSAGE;
    setAuthState((prev) => {
      if (prev.ready === nextReady && prev.message === nextMessage) {
        return prev;
      }
      return nextMessage !== undefined
        ? { ready: nextReady, message: nextMessage }
        : { ready: nextReady };
    });
  }, [authStatusQuery.data]);
  useEffect(() => {
    if (!authStatusQuery.isError) return;
    const message =
      authStatusQuery.error?.message?.trim().length
        ? authStatusQuery.error.message.trim()
        : AUTH_ERROR_MESSAGE;
    setAuthState((prev) => {
      if (!prev.ready && prev.message === message) {
        return prev;
      }
      return { ready: false, message };
    });
  }, [authStatusQuery.isError, authStatusQuery.error]);
  const handleSignIn = useCallback(async () => {
    const startUrl = normalizedServerUrl
      ? `${normalizedServerUrl}/api/oauth/start`
      : "/api/oauth/start";
    try {
      const response = await fetch(startUrl, {
        method: "POST",
        credentials: "include",
      });
      const raw = await response.text();
      let payload: Record<string, unknown> = {};
      if (raw) {
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          payload = {};
        }
      }
      if (!response.ok) {
        const errorMessage =
          typeof payload.error === "string"
            ? payload.error
            : typeof payload.message === "string"
              ? payload.message
              : AUTH_ERROR_MESSAGE;
        console.error("Failed to start OpenRouter sign-in", {
          status: response.status,
          error: errorMessage,
        });
        setAuthState({ ready: false, message: errorMessage });
        return;
      }
      const authUrl = (payload as { authUrl?: unknown }).authUrl;
      if (typeof authUrl === "string" && authUrl.length > 0) {
        window.location.href = authUrl;
        return;
      }
      const infoMessage =
        typeof (payload as { message?: unknown }).message === "string"
          ? (payload as { message: string }).message
          : DEFAULT_AUTH_MESSAGE;
      setAuthState((prev) => ({
        ready: prev.ready,
        message: infoMessage,
      }));
      void refetchAuthStatus();
    } catch (error) {
      console.error("Failed to start OpenRouter sign-in", error);
      setAuthState({ ready: false, message: "Unable to start sign-in. Please try again." });
    }
  }, [normalizedServerUrl, refetchAuthStatus]);
  const providerMeta = useMemo(
    () => ({
      name: "OpenRouter",
      webSearchLabel: "Enable OpenRouter Web Search",
      webSearchDescription:
        "Augment responses with OpenRouter’s web results for fresher answers.",
      authCTA: (
        <button
          type="button"
          onClick={handleSignIn}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-muted focus:outline-none focus-visible:ring"
        >
          Sign in
        </button>
      ),
    }),
    [handleSignIn],
  );

  return (
    <section className="grid grid-cols-1 h-dvh">
      <OpenChatComponent
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
