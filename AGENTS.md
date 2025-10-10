# AGENTS.md - open-chat
## What this is
Guidance for agents working in this repository. Be concise, verify every command you cite, and prefer linking to source over duplicating code. Be extremely concise. Sacrifice grammar for the sake of concision.

## Quickstart commands
| Command | Description | Notes |
| --- | --- | --- |
| `bun install` | Install all workspace dependencies | Required after cloning or updating lockfile |
| `bun dev` | Run example web client (3001) + server API (3000) together | Uses Bun workspace filtering under the hood |
| `bun dev:web` | Run the example web client only | Reads `.env.local` in `examples/web/` |
| `bun dev:server` | Run the example server only | Reads `.env.local` in `examples/server/` |
| `bun run --filter '*' build` | Build all workspaces (server, web, package) | Use before publishing or verifying production bundles |
| `bun run --filter '*' check-types` | Type-check every workspace | Helpful before commits |
| `bun run --filter '*' check` | Run `oxlint` across the repo | Lint configuration lives in `.oxlintrc.json` |
| `bun run --filter open-chat build` | Build the reusable `@faith-tools/open-chat` package | Runs `tsup` + Tailwind CSS bundling inside the package workspace |

All commands above should be executed from the repository root unless a note says otherwise.

## Architecture overview
- **Front-end example**: [`examples/web/`](examples/web/) (React + Vite + TanStack Router) mounts the published `@faith-tools/open-chat` component and optional web component wrapper.
- **Back-end example**: [`examples/server/`](examples/server/) (Hono + ai-sdk) proxies chat requests, handles OpenRouter OAuth, and manages MCP connections.
- **Shared component package**: [`packages/open-chat/`](packages/open-chat/) exports the React component, hooks, utilities, and a web component build produced via `tsup` and Tailwind.
- **Data flow**: user input → web component/hook → server `/api/chat` → ai-sdk transport (OpenRouter or custom) → optional MCP clients → response streamed back to the UI with tool/metadata support.

## Environment and configuration
| Variable | Scope | Required | Description / Notes |
| --- | --- | --- | --- |
| `VITE_SERVER_URL` | Web example (`examples/web/`) | Yes | Base URL for the server API (default `http://localhost:3000`) |
| `OPEN_ROUTER_API_KEY` | Web example (optional) | No | Lets the client call OpenRouter directly when using custom transports; keep short-lived |
| `VITE_LOCKED_MODEL` | Web example (optional) | No | Hard-clamps model selection in the UI when set |
| `CORS_ORIGIN` | Server example (`examples/server/`) | Yes | Allowed origin for browser calls (e.g., `http://localhost:3001`) |
| `CLIENT_URL` | Server example (optional) | No | Explicit client URL for OAuth callbacks; falls back to `CORS_ORIGIN` |
| `ENCRYPTION_SECRET` | Server example | Yes | 32+ char secret used to encrypt stored API keys |
| `OPEN_ROUTER_API_KEY` (stored via OAuth) | Server example | No | Retrieved during OAuth; stored encrypted via `ENCRYPTION_SECRET` |

Copy the provided `.env.example` files in `examples/web/` and `examples/server/` before running dev servers. Do **not** commit real secrets.

## Project structure (high level)
- [`packages/open-chat/src/`](packages/open-chat/src/) — Source for the reusable chat component, hooks (`use-mcp.ts`), web component adapter, and UI primitives.
- [`examples/web/src/`](examples/web/src/) — Example application wiring the component into a Vite + TanStack Router shell, including authentication and MCP UI dialogs.
- [`examples/server/src/`](examples/server/src/) — Hono router implementations for `/api/chat`, `/api/models`, `/api/oauth/*`, and MCP registry proxy logic.
- [`MCP-SUPPORT.md`](MCP-SUPPORT.md) — Feature checklist and roadmap for MCP capabilities.
- [`README.md`](README.md) — Public-facing overview, usage examples, and roadmap items you can reuse when explaining features.

## Development workflow
1. **Install & configure**: `bun install`, then copy `.env.example` files into `.env.test` or `.env.development` for both web and server examples.
2. **Run locally**: 
   - `bun dev` for full-stack testing.
   - Use `bun dev:web` / `bun dev:server` when you need to focus on a single side.
3. **Iterate on the package**: Build it in isolation with `bun run --filter open-chat build`; Tailwind CSS output lives in `packages/open-chat/dist/tailwind.css`.
4. **Verify before push**: Run `bun run --filter '*' check-types` and `bun run --filter '*' check` (oxlint). We lack CI, so treat these as mandatory.
5. **Regenerate bundles**: `bun run --filter '*' build` ensures examples and the package are ready for deployment or publication.
6. **Troubleshooting tips**:
   - If MCP connectors fail, inspect [`examples/server/src/routers/chat.ts`](examples/server/src/routers/chat.ts) logs for transport auth errors.
   - OAuth issues usually mean `CLIENT_URL` / `CORS_ORIGIN` mismatch or missing `ENCRYPTION_SECRET`.

## Deployment
- **Current status**: POC only; no automated hosting or CI/CD configured.
- **Manual preview**: `bun run --filter '*' build`, then serve `examples/web/dist/` with any static server and deploy the compiled server bundle from `examples/server/dist/`.
- **Scripts**: Use `bun run --filter server compile` if you need a single-file executable (`packages/server/package.json` exposes `compile` via Bun).
- **Post-deploy checklist**: Manually test OAuth flows and MCP tool connections — no automated smoke tests exist.

## Integrations
- **AI SDK transports**: `@faith-tools/open-chat` defaults to OpenRouter via server proxy but supports custom transports through the `useChatOptions` prop (see [`README.md`](README.md#override-transport-or-lock-a-model-with-usechatoptions)).
- **OpenRouter (optional)**: Server OAuth endpoints live in [`examples/server/src/routers/oauth.ts`](examples/server/src/routers/oauth.ts); tokens are encrypted with `ENCRYPTION_SECRET`. The client can either rely on server-side proxying or inject its own bearer tokens.
- **Model discovery**: [`packages/open-chat/src/lib/openrouter.models.ts`](packages/open-chat/src/lib/openrouter.models.ts) + [`examples/server/src/routers/models.ts`](examples/server/src/routers/models.ts) handle fetching and caching model lists.
- **MCP connectors**: UI & storage live in [`packages/open-chat/src/hooks/use-mcp.ts`](packages/open-chat/src/hooks/use-mcp.ts) and mirrored example code. Server transports in [`examples/server/src/routers/chat.ts`](examples/server/src/routers/chat.ts) auto-detect `streamable-http` with SSE fallback.
- **Pending MCP support**: Prompts/resources are tracked in [`MCP-SUPPORT.md`](MCP-SUPPORT.md); they are partially implemented in the hook but not surfaced in the example UI yet.
- **Web component**: [`packages/open-chat/src/web-component.ts`](packages/open-chat/src/web-component.ts) exports a no-Shadow-DOM default; additional caveats are intentionally deferred until the component stabilises.

## References
- [`README.md`](README.md) — High-level feature overview and usage snippets.
- [`packages/open-chat/package.json`](packages/open-chat/package.json) — Package scripts, dependencies, and entry points.
- [`examples/web/package.json`](examples/web/package.json) / [`examples/server/package.json`](examples/server/package.json) — Example app scripts and dependencies.
- [`examples/server/src/routers/chat.ts`](examples/server/src/routers/chat.ts) — AI + MCP bridging logic.
- [`packages/open-chat/src/hooks/use-mcp.ts`](packages/open-chat/src/hooks/use-mcp.ts) — Shared MCP hook logic.
- [`MCP-SUPPORT.md`](MCP-SUPPORT.md) — MCP roadmap and current status checklist.