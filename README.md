# Open Chat

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **Tailwind v4** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **ai-elements** - AI Chatbot elements
- **Hono** - Lightweight, performant server framework
- **Node.js** - Runtime environment
- **Bun** - Package Manager
- **PWA** - Progressive Web App support

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

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, and more.