# Open Chat Component - Provider-Agnostic Plan

## Current OpenRouter Flow Overview
- **Frontend gating:** [`OpenChatComponent`](packages/open-chat/src/components/open-chat-component.tsx:183) polls `/api/oauth/status` and blocks submissions when `requireAuth` is true and no session is connected.
- **PKCE initiation:** [`/api/oauth/start`](examples/server/src/routers/oauth.ts:31) stores a verifier cookie and returns the OpenRouter authorization URL.
- **Browser callback:** [`onMcpAuthorization`](packages/open-chat/src/lib/auth/calback.ts:10) exchanges the code for tokens, saves them in `localStorage`, and notifies the opener via `BroadcastChannel`.
- **Server exchange:** [`/api/oauth/exchange`](examples/server/src/routers/oauth.ts:57) swaps code + verifier for an API key, encrypts it, and writes the `ork` HttpOnly cookie.
- **Chat execution:** [`/api/chat`](examples/server/src/routers/chat.ts:81) decrypts the cookie, creates the OpenRouter client, attaches MCP metadata, and streams the AI SDK response.

## Goal
Offer a “serverless” mode so host apps can point the component at any AI-SDK-compatible endpoint (OpenAI-compatible, local gateway, etc.) by providing URL + headers, while leaving the existing OpenRouter backend path untouched.

## Proposed Changes

### 1. Optional `endpointConfig` Prop
- Shape: `{ baseUrl: string; model: string; headers?: Record<string,string>; query?: Record<string,string>; }`.
- Presence signals the component to bypass `/api/chat` and talk directly to the configured endpoint.

### 2. Client-Side Transport
- Replace `DefaultChatTransport` with a lightweight transport when `endpointConfig` exists:
  - Instantiate `createOpenAICompatible({ baseURL, headers })`.
  - Use `streamText` to send `[systemPrompt, ...messages]`.
  - Forward MCP payload (`mcpServers`, etc.) so tool calls remain functional.

### 3. Model Selection Handling
- When `endpointConfig` is active, rely on the provided `model`.
- If the host supplies custom model options, surface them; otherwise hide the selector UI.

### 4. Security Guidance
- Document that headers (e.g., bearer tokens) live in the browser in this mode.
- Recommend short-lived or scoped keys, or moving to a backend proxy for long-term deployments (mirrors AI SDK guidance where API keys are usually loaded from env variables at provider construction).

### 5. Packaging
- Keep bundling `@ai-sdk/react`, `ai`, and `@ai-sdk/openai-compatible`.
- Export a typed helper (e.g., `EndpointConfig`) plus a factory for creating the direct transport so hosts can reuse it.

### 6. Backwards Compatibility
- If `endpointConfig` is absent, continue using the existing OpenRouter OAuth + `/api/chat` flow with no changes required from current users.

## Follow-Up Tasks
1. Implement the `endpointConfig` prop and direct transport path.
2. Update documentation explaining the two operating modes and security trade-offs.
3. Provide a basic example showing usage with a generic OpenAI-compatible endpoint.