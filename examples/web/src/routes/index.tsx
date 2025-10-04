'use client';
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import OpenChatComponent, {
  useOpenRouterModelOptions,
} from '@faith-tools/open-chat';
import type { UIMessage, UseChatOptions } from "@ai-sdk/react";
import "@faith-tools/open-chat/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const WrappedChatbotDemo = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatBotDemo />
    </QueryClientProvider>
  );
}

const ChatBotDemo = () => {
  const baseServerUrl = import.meta.env.VITE_SERVER_URL;
  const lockedModelEnv = import.meta.env.VITE_LOCKED_MODEL;
  const lockedModel = typeof lockedModelEnv === "string" ? lockedModelEnv.trim() : undefined;
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

  return (
    <section className="grid grid-cols-1 h-dvh">
      <OpenChatComponent
        openRouterModel={lockedModel ?? "openai/gpt-5"}
        api={import.meta.env.VITE_SERVER_URL + '/api/chat'}
        requireAuth={true}
        placeholder="Ask OpenChat..."
        onNewMessage={undefined}
        useChatOptions={lockedChatOptions}
        {...fetchProps}
      />
    </section>
  );
};

export const Route = createFileRoute("/")({
  component: WrappedChatbotDemo,
});
