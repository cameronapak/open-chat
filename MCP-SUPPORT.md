## MCP Support

Most likely MCP's will be called "Connectors" on the client-side.

- [x] Enable remote `streamable-http` type MCP's
- [x] Enable remote `sse` type MCP's
- Locally machine-run MCP packages are not supported at this time
- [x] I can enable an MCP to be used in chat
- [x] I can remove an MCP from my list of MCP's
- [x] I can OAuth into an MCP
- [x] I can add an API Key to an MCP
- [x] When I click row of MCP server, I want to be able to just open it. Then, if I click the arrow, I wanna see more detais. 

## MCP Registry

- [x] I can get the list of servers from the [Official MCP registry](./apps/server/src/lib/mcp-registry/index.ts)
- [x] I can connect to an MCP server from the official registry
- [ ] I can filter / sort the Official MCP registry
- [ ] I can add a custom MCP subregistry
- [ ] I can filter / sort the custom MCP subregistry

## Custom MCP's

- [x] I can manually add a remote `streamable-http` type MCP
- [ ] I can manually add a remote `sse` type MCP
- [ ] I can add an API Key to my custom MCP (otherwise, if auth'd it'll kick to OAuth)

## Prompts

- [x] I can receive [prompts](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts) from an MCP
- [ ] In the web client, I can use prompts from MCP's

## Web Client

Too many tools connected at the same time makes it very hard for the LLM to know which one to choose. 

- [x] For every chat, I must manually toggle which Connectors to use. 
- [x] I can tell a connector to always be used in chat
- [x] Given I save/install an MCP on the client, I must validate the server connection before actually saving it.

## Client-side API Key Auth (POC)

Status
- [x] User can enter an API key when adding a custom MCP in the “Add Integration” dialog
- [x] Keys can be saved “Session-only” (kept in-memory) or “Persisted” (encrypted at rest)
- [x] Server receives API key per-request and attaches the proper header
- [x] Supports two header schemes: “Authorization: Bearer” and “X-API-Key” (default is Bearer)
- [x] OAuth continues to work; OAuth is preferred when available. If an API key is provided and no OAuth token is present, the API key is used. If neither is required, the server connects unauthenticated.

Where to use it
- UI: MCP add dialog at [`mcp-server-list-dialog.tsx`](apps/web/src/components/mcp-server-list-dialog.tsx:1)
  - Fields:
    - API Key (optional)
    - Header scheme: Authorization: Bearer | X-API-Key
    - Session-only checkbox (don’t persist)
  - Behavior:
    - If API key is provided, it will be saved (session-only or encrypted at rest) and used.
    - If API key is not provided and the server requires auth, OAuth will be auto-triggered.
    - If neither is required, the server connects without auth.
  - On successful connection test, the server is saved and the API key presence flag is computed.

How keys are stored (web client)
- Encryption: AES-GCM using Web Crypto.
- AES key material (JWK) is stored in IndexedDB; API key ciphertext + IV stored in localStorage under a canonical URL hash.
- Session-only keys are never written to disk; they live in-memory for the tab.
- Implementation: [`apps/web/src/lib/keystore.ts`](apps/web/src/lib/keystore.ts)

What gets sent to the server
- Client includes per-enabled server:
  - OAuth accessToken (if present)
  - API key + headerScheme (if stored and available)
- Server attaches headers for every request to the MCP server:
  - If OAuth: Authorization: Bearer <access_token>
  - If API key:
    - Authorization: Bearer <api_key> (default), or
    - X-API-Key: <api_key> (when selected)
- Server never persists or logs secrets.
- Implementation (client payload): [`open-chat-component.tsx`](apps/web/src/components/open-chat-component.tsx:322)
- Implementation (server headers): [`apps/server/src/routers/chat.ts`](apps/server/src/routers/chat.ts)

Security notes (per MCP Authorization 2025-06-18)
- Always send credentials over HTTPS (localhost allowed for dev).
- Keys are encrypted at rest on the client, but XSS can still exfiltrate; keep CSP tight and avoid untrusted scripts.
- For OAuth tokens, the MCP spec mandates Authorization: Bearer headers on every HTTP request.
- For API-keys, some MCP servers expect X-API-Key; we support that header scheme as well.
- We do not pass through tokens to any upstream APIs; tokens are only used to authenticate to the selected MCP server.

Future enhancements
- Per-server editing UI to view/remove/update stored API key after creation
- WWW-Authenticate parsing and protected resource metadata discovery to guide OAuth setup
- Server-side allowlist for MCP URLs to avoid SSRF in production
