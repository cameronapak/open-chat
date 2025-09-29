'use client';
import { createFileRoute } from "@tanstack/react-router";
import OpenChatComponent from '@/components/open-chat-component';

const ChatBotDemo = () => {
  return (
    <section className="grid grid-cols-1 h-dvh">
      <OpenChatComponent
        openRouterModel="openai/gpt-4o"
        api={import.meta.env.VITE_SERVER_URL + '/api/chat'}
        requireAuth={true}
        placeholder="Ask OpenChat..."
        className="w-full h-full grid grid-cols-1"
        onNewMessage={(msg) => console.log("New message:", msg)}
      />
    </section>
  );
};

export const Route = createFileRoute("/")({
  component: ChatBotDemo,
});