'use client';
import { createFileRoute } from "@tanstack/react-router";
import OpenChatComponent, {
  useOpenRouterModelOptions,
} from '@faith-tools/open-chat';
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
  const { data: modelOptions, isLoading, error } = useOpenRouterModelOptions(baseServerUrl);

  const modelsError = error ? (error instanceof Error ? error.message : String(error)) : undefined;

  return (
    <section className="grid grid-cols-1 h-dvh">
      <OpenChatComponent
        openRouterModel="openai/gpt-5"
        api={import.meta.env.VITE_SERVER_URL + '/api/chat'}
        requireAuth={true}
        placeholder="Ask OpenChat..."
        onNewMessage={undefined}
        models={modelOptions}
        modelsLoading={isLoading}
        modelsError={modelsError}
      />
    </section>
  );
};

export const Route = createFileRoute("/")({
  component: WrappedChatbotDemo,
});
