# OpenChat

A truly open AI chatbot.

Not locked down to any given LLM provider. 

Sign into your OpenRouter account via Oauth, secured through encryption.

Easily import into your existing apps (Coming soon).

I'd love to have an API where someone could drop OpenChat into their app like this...

```tsx
{/* Work in Progress - TBD */}
function Chat() {
  return (
    <OpenChatComponent
      openRouterModel="openai/gpt-4o"
      api="https://your-backend.com/chat"
      placeholder="Ask OpenChat..."
      tools={{
        enabled: true,
        mcpServers: [{ 
          url: "https://your-mcp-server.com/sse",
          name: "Search Web"
        }]
      }}
      className="w-full h-96"
      onNewMessage={(msg) => console.log("New message:", msg)}
    />
  )
}

{/* Work in Progress - TBD */}
function HighlyCustomizedChat() {
  return (
    <OpenChatComponent
      openRouterModel="openai/gpt-4o"
      api="https://your-backend.com/chat"
      placeholder="Ask OpenChat..."
      tools={{
        enabled: true,
        mcpServers: [{ 
          url: "https://your-mcp-server.com/sse",
          name: "Search Web"
        }]
      }}
      mcpRegistryUrl="https://registry.modelcontextprotocol.io"
      threadId="unique-thread-id"
      systemPrompt="You are a helpful assistant."
      userProfile={{
        name: "Cam",
        chatPreferences: JSON.stringify({ theme: "dark" }),
        avatarUrl: "https://example.com/avatar.png",
      }}
      initialMessages={[{ id: "1", role: "user", content: [{ type: "text", text: "Hello!" }] }]}
      className="w-full h-96"
      onNewMessage={(msg) => console.log("New message:", msg)}
    />
  )
}
```

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

- [ ] Has default AI prompt that honors God and the Bible
- [x] Open Router support
- [ ] Get list of OpenRouter models based on [user provider preferences](https://openrouter.ai/docs/api-reference/list-models-filtered-by-user-provider-preferences)
- [ ] MCP client support
  - [x] MCP Tools
  - [ ] MCP Prompts
  - [ ] MCP Resources
- [ ] One-click MCP install
- [ ] Add your own MCP server
- [x] MCP UI support
- [ ] Local LLM support (via Transformers JS)
- [ ] Personality Profile (tailor LLM to your preferences)
- [ ] Web component chatbot export
- [ ] Make it onto [the official MCP Clients list](https://modelcontextprotocol.io/clients)

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