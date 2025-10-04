'use client';
import { createFileRoute } from "@tanstack/react-router";
import OpenChatComponent from '@faith-tools/open-chat';
import "@faith-tools/open-chat/styles.css";

const ChatBotDemo = () => {
  return (
    <section className="grid grid-cols-1 h-dvh">
      <OpenChatComponent
        openRouterModel="openai/gpt-5"
        api={import.meta.env.VITE_SERVER_URL + '/api/chat'}
        requireAuth={true}
        placeholder="Ask OpenChat..."
        onNewMessage={undefined}
      />
    </section>
  );
};

export const Route = createFileRoute("/")({
  component: ChatBotDemo,
});
