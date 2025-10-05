# OpenChat

![OpenChat](./open-chat-banner.png)

Self-host your own MCP client in your existing apps.

OpenChat is a truly open AI chatbot.

Not locked down to any given LLM provider. 

Use any AI SDK-compatible transport. (Comes with helpers to easily integrate OpenRouter, letting users control their own models and token usage.)

Easily import into your existing apps (Coming soon).

## OpenChatComponent - Drop-in AI Chat

The OpenChatComponent is a fully-featured, reusable chat component that can be easily integrated into any React application.

### Installation

```bash
# Coming soon: npm package
# For now, copy the component from apps/web/src/components/open-chat-component.tsx
```

### Basic Usage

```tsx
import { OpenChatComponent } from '@/components/open-chat-component';

function App() {
  return (
    <OpenChatComponent
      openRouterModel="openai/gpt-5"
      api="http://localhost:3000/api/chat"
      placeholder="Ask me anything..."
      className="w-full h-screen"
    />
  );
}
```

### With Authentication Required

```tsx
import { OpenChatComponent } from '@/components/open-chat-component';

function SecureChat() {
  return (
    <OpenChatComponent
      openRouterModel="openai/gpt-5"
      api="http://localhost:3000/api/chat"
      requireAuth={true}  // Forces user to connect OpenRouter account
      placeholder="Ask OpenChat..."
      className="w-full h-96"
      onError={(error) => console.error("Chat error:", error)}
    />
  );
}
```

### With MCP Tools Integration

```tsx
import { OpenChatComponent } from '@/components/open-chat-component';

function ChatWithTools() {
  return (
    <OpenChatComponent
      openRouterModel="anthropic/claude-3-opus"
      api="http://localhost:3000/api/chat"
      tools={{
        enabled: true,
        mcpServers: []  // User can add servers via the UI dialog
      }}
      mcpRegistryUrl="https://registry.modelcontextprotocol.io"
      className="w-full h-screen"
      onNewMessage={(msg) => console.log("New message:", msg)}
    />
  );
}
```

### Fully Customized Example

```tsx
import { OpenChatComponent } from '@/components/open-chat-component';
import type { UIMessage } from '@ai-sdk/react';

function AdvancedChat() {
  const initialMessages: UIMessage[] = [
    {
      id: "1",
      role: "assistant",
      content: [{ type: "text", text: "Hello! How can I help you today?" }]
    }
  ];

  return (
    <OpenChatComponent
      // Model configuration
      openRouterModel="openai/gpt-5"
      allowedModels={[  // Restrict model selection
        "openai/gpt-5",
        "anthropic/claude-3-opus",
        "google/gemini-pro"
      ]}
      
      // API configuration
      api="http://localhost:3000/api/chat"
      requireAuth={true}
      
      // MCP Tools
      tools={{
        enabled: true,
        mcpServers: []
      }}
      mcpRegistryUrl="https://registry.modelcontextprotocol.io"
      
      // Chat configuration
      threadId="unique-thread-123"
      systemPrompt="You are a helpful AI assistant specialized in coding."
      initialMessages={initialMessages}
      placeholder="Ask about coding..."
      
      // User profile
      userProfile={{
        name: "Developer",
        chatPreferences: JSON.stringify({
          preferredLanguage: "TypeScript",
          codeStyle: "functional"
        }),
        avatarUrl: "https://example.com/avatar.png",
      }}
      
      // UI customization
      className="w-full h-screen max-w-4xl mx-auto"
      height="100vh"
      theme="dark"
      
      // Callbacks
      onNewMessage={(msg) => {
        console.log("New message:", msg);
        // Save to database, analytics, etc.
      }}
      onSend={(text) => {
        console.log("User sent:", text);
      }}
      onError={(error) => {
        console.error("Error:", error);
        // Handle errors appropriately
      }}
      
      // Custom message rendering (optional)
      renderMessage={(message, part, index) => {
        // Return null to use default rendering
        // Or return custom JSX for specific message types
        if (part.type === 'custom-type') {
          return <div key={index}>Custom rendering for {part.type}</div>;
        }
        return null;
      }}
    >
      {/* Optional footer content */}
      <div className="p-2 text-center text-sm text-muted-foreground">
        Powered by OpenRouter
      </div>
    </OpenChatComponent>
  );
}
```

### Supplying Models Externally

Model selection is now fully controlled by the parent. Fetch any list of models (for example, from OpenRouter) and pass it into the component:

```tsx
import OpenChatComponent, {
  useOpenRouterModelOptions,
} from "@faith-tools/open-chat";

function ChatWithOpenRouterModels() {
  const baseServerUrl = import.meta.env.VITE_SERVER_URL;
  const { data: models, isLoading, error } = useOpenRouterModelOptions(baseServerUrl);

  return (
    <OpenChatComponent
      api={`${baseServerUrl}/api/chat`}
      requireAuth
      models={models}
      modelsLoading={isLoading}
      modelsError={error ? (error instanceof Error ? error.message : String(error)) : undefined}
    />
  );
}
```

If you already have model data, simply map it into the `ChatModelOption` shape and pass it via the `models` prop.

### Override Transport or Lock a Model with `useChatOptions`

Pass `useChatOptions` when you need full control over the underlying `useChat` hook—custom transports, headers, or a fixed model. When a model is supplied through these options, the dropdown hides automatically so end users cannot switch away.

```tsx
import { DefaultChatTransport } from "ai";

<OpenChatComponent
  api="http://localhost:3000/api/chat"
  useChatOptions={{
    transport: new DefaultChatTransport({
      api: "https://proxy.example.com/chat",
      headers: { Authorization: `Bearer ${token}` },
      body: { model: "my-provider/small-model" },
    }),
  }}
/>
```

To hide the selector explicitly, set the model in your transport or supply it in the request body. The UI detects the locked model and removes the picker.

> ⚠️ **Security note:** any headers, API keys, or bearer tokens defined in `useChatOptions` live in the browser. Use short-lived scoped tokens, rotate them frequently, or proxy requests through your own backend if you cannot trust the client environment.

[OpenChatComponent](packages/open-chat/src/components/open-chat-component.tsx) no longer runs the OpenRouter OAuth dialog. Do the OAuth handshake yourself (hit `/api/oauth/start`, finish the redirect, stash the bearer wherever you trust it) and feed that token into `useChatOptions.prepareSendMessagesRequest`.

```tsx
import { useEffect, useMemo, useState } from "react";
import OpenChatComponent from "@faith-tools/open-chat";

const baseServerUrl = import.meta.env.VITE_SERVER_URL;
const lockedModel = import.meta.env.VITE_LOCKED_MODEL?.trim();

async function exchangeToken() {
  const { authUrl } = await fetch(`${baseServerUrl}/api/oauth/start`, {
    method: "POST",
    credentials: "include",
  }).then((res) => res.json());

  if (authUrl) {
    window.location.href = authUrl; // external redirect flow
    return null;
  }

  const { token } = await fetch(`${baseServerUrl}/api/oauth/token`, {
    credentials: "include",
  }).then((res) => res.json());

  return token;
}

export function ChatShell() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    exchangeToken().then(setToken).catch(console.error);
  }, []);

  const chatOptions = useMemo(() => {
    if (!token) return undefined;
    return {
      prepareSendMessagesRequest: ({ body }: { body?: Record<string, unknown> }) => ({
        headers: { Authorization: `Bearer ${token}` },
        body: {
          ...(body ?? {}),
          model: lockedModel ?? body?.model ?? "openai/gpt-5",
        },
      }),
    };
  }, [token]);

  return (
    <OpenChatComponent
      api={`${baseServerUrl}/api/chat`}
      openRouterModel={lockedModel ?? "openai/gpt-5"}
      useChatOptions={chatOptions}
    />
  );
}
```

Use an env var like `VITE_LOCKED_MODEL` to hard clamp the model (same trick as the example app). The published demo in [examples/web/src/routes/index.tsx](examples/web/src/routes/index.tsx) shows wrapping the component so you can bake in defaults—copy that pattern if you want your own opinionated shell.

### Component Props

See the full TypeScript interface in [`apps/web/src/types/open-chat-component.ts`](apps/web/src/types/open-chat-component.ts) for detailed prop documentation.

Key props include:
- `openRouterModel` - Initial AI model to use
- `allowedModels` - Restrict available models for selection
- `api` - Backend API endpoint for chat
- `requireAuth` - Force authentication before chatting
- `tools` - MCP server configuration
- `systemPrompt` - System instructions for the AI
- `threadId` - Unique thread identifier
- `onNewMessage` - Callback for new messages
- `renderMessage` - Custom message rendering
- `theme` - Light/dark theme support

## Features

- **[TypeScript](https://www.typescriptlang.org/)** - For type safety and improved developer experience
- **[TanStack Router](https://tanstack.com/router/latest/docs/framework/react/overview)** - File-based routing with full type safety
- **[Tailwind v4](https://tailwindcss.com/)** - Utility-first CSS for rapid UI development
- **[shadcn/ui](https://ui.shadcn.com/)** - Reusable UI components
- **[ai-sdk](https://ai-sdk.dev/)** - AI Toolkit for TypeScript
- **[ai-elements](https://ai-sdk.dev/elements/overview)** - AI Chatbot elements
- **use-mcp** hook (fork) — "A lightweight React hook for connecting to Model Context Protocol (MCP) servers. Simplifies authentication and tool calling for AI systems implementing the MCP standard."
- **[Hono](https://hono.dev)** - Lightweight, performant server framework
- **[Node.js](https://nodejs.org/en)** - JavaScript runtime environment
- **[Bun](https://bun.sh)** - JavaScript package Manager
- **PWA** - Progressive Web App support

## Roadmap 🗺️

- [x] Open Router support
- [ ] Get list of OpenRouter models based on [user provider preferences](https://openrouter.ai/docs/api-reference/list-models-filtered-by-user-provider-preferences)
- [ ] MCP client support
  - [x] MCP Tools
  - [ ] MCP Prompts
  - [ ] MCP Resources
- [ ] Host this app
- [ ] Add info about [Open Inference](https://www.openinference.xyz/) into the settings dialog
- [ ] Allow theme CSS variables for the component
- [ ] One-click MCP install
- [x] Add your own MCP server
- [x] MCP UI support
- [ ] [Built-in AI support](https://ai-sdk.dev/providers/community-providers/built-in-ai) (Transformers JS + AI SDK + [built-in-ai](https://github.com/jakobhoeg/built-in-ai)) 
  - Examples
    - https://huggingface.co/spaces/ibm-granite/Granite-4.0-WebGPU/blob/main/src/worker.js
    - https://huggingface.co/spaces/LiquidAI/LFM2-WebGPU/blob/main/src/App.tsx
- [ ] Personality Profile (tailor LLM to your preferences)
- [ ] Web component chatbot export
- [ ] Make it onto [the official MCP Clients list](https://modelcontextprotocol.io/clients)
- [ ] Make `dialogAsDrawer: boolean` prop for apps that don't want a drawer and would just benefit from a dialog popup for the connectors panel.

## Getting Started

First, install the dependencies:

```bash
bun install
```

Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
open-chat/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono)
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps
- `cd apps/web && bun generate-pwa-assets`: Generate PWA assets

## Sources

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

## MCP Registries

Here are some top-tier MCP registries I've been keeping my eyes on:

- [Official MCP Registry](https://mcp-registry.val.run/)
- [PulseMCP](https://www.pulsemcp.com/servers)
- [Smithery](https://smithery.ai/)
- [Pica](https://www.picaos.com/)
- [Rube](https://rube.app/)

## Contributing

For contributors: see [AGENTS.md](AGENTS.md)