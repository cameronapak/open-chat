import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import {
  streamText,
  type ToolSet,
  convertToModelMessages,
  type UIMessage,
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClient as MCPClient,
  stepCountIs,
  type ModelMessage
} from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { decrypt } from '@/lib/crypto';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

interface MCPServerConfig {
  id: string
  name: string
  url: string
  enabled: boolean
  // Optional OAuth access token forwarded from the browser (POC)
  accessToken?: string
  // Optional API key forwarded from the browser (client encrypts at rest)
  apiKey?: string
  // Preferred header scheme when using API key
  headerScheme?: 'authorization-bearer' | 'x-api-key'
  // Client preference for auth method
  authPreference?: 'oauth' | 'api-key'
}

// Taken from use-mcp Repo
const systemPrompt = {
  role: 'system' as const,
  content: `
    - Do not wrap your responses in html tags.
    - Do not apply any formatting to your responses.
    - You are an expert conversational chatbot. Your objective is to be as helpful as possible.
    - You must keep your responses relevant to the user's prompt.
    - You must respond with a maximum of 512 tokens (300 words).
    - You must respond clearly and concisely, and explain your logic if required.
    - You must not provide any personal information.
    - Do not respond with your own personal opinions, and avoid topics unrelated to the user's prompt.
    - Be extremely concise. Sacrifice grammar for the sake of concision.
  `,
} as ModelMessage;

export const chatRouter = new Hono();

// Helpers
const canonicalizeUrl = (u: string): string => {
  try {
    const parsed = new URL(u);
    let pathname = parsed.pathname || '';
    if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search || ''}`;
  } catch {
    return u;
  }
};
const isAuthError = (err: unknown): boolean => {
  const msg = String((err as any)?.message ?? err ?? '');
  const status =
    (err as any)?.status ??
    (err as any)?.response?.status ??
    (/\b(401|403)\b/.exec(msg)?.[1] ? Number(/\b(401|403)\b/.exec(msg)?.[1]) : undefined);
  return status === 401 || status === 403 || /\b(401|403)\b/.test(msg);
};
const errorCode = (err: unknown): number | undefined => {
  return (err as any)?.status ?? (err as any)?.response?.status;
};
const safeOrigin = (u: string): string => {
  try {
    const { origin } = new URL(u);
    return origin;
  } catch {
    return u;
  }
};

// Handle POST /api/chat
const chatRoute = chatRouter.post('/', async (c) => {
  const mcpClients: MCPClient[] = [];
  try {
    const body = await c.req.json().catch(() => ({}));
    const { messages, model, reasoning, mcpServers }: {
      messages: UIMessage[];
      model: string;
      reasoning: boolean;
      mcpServers?: MCPServerConfig[]
    } = body ?? {};

    if (!model) {
      return c.json({ error: 'Missing model' }, 400);
    }
    if (!Array.isArray(messages)) {
      return c.json({ error: 'Invalid messages' }, 400);
    }

    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret) {
      return c.json({ error: 'Server not configured' }, 500);
    }

    // Load encrypted key from HttpOnly cookie
    const encryptedKey = getCookie(c, 'ork');
    if (!encryptedKey) {
      return c.json({ error: 'Not connected to OpenRouter' }, 401);
    }

    const apiKey = decrypt(encryptedKey, secret);
    const openrouter = createOpenRouter({ apiKey });

    // @TODO - Block client-supplied MCP URLs (SSRF risk). We’re instantiating StreamableHTTPClientTransport directly from the mcpServers payload, so any caller can coerce the server into reaching arbitrary/internal endpoints (e.g. AWS metadata, DB admin panels). That’s a textbook SSRF vector and must be plugged before shipping. Please load/allowlist MCP endpoints from trusted server-side config (or at least reject anything that isn’t explicitly whitelisted) and ignore/strip user-provided URLs.
    // Initialize MCP clients (POC-fast; accepts client-supplied URLs). Try streamable-http first, then fall back to http+sse.
    for (const mcpServer of mcpServers ?? []) {
      if (!mcpServer.enabled) continue;

      const providedUrl = mcpServer.url;
      const url = canonicalizeUrl(providedUrl);
      if (!url) continue;
      const remoteMcpUrl = new URL(url);

      // Log canonicalization (no secrets)
      if (url !== providedUrl) {
        console.log('[MCP] Canonicalized MCP URL:', url, 'from:', providedUrl);
      } else {
        console.log('[MCP] Using MCP URL:', url);
      }

      // Enforce HTTPS except for localhost/127.0.0.1
      const isLocal =
        remoteMcpUrl.hostname === 'localhost' || remoteMcpUrl.hostname === '127.0.0.1';
      if (remoteMcpUrl.protocol !== 'https:' && !isLocal) {
        console.warn('[MCP] Skipping non-HTTPS URL (only https or localhost allowed):', url);
        continue;
      }

      const commonHeaders: Record<string, string> = {
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-06-18',
      };
      // Choose auth based on preference and available creds (do not log secrets)
      const httpHeaders: Record<string, string> = { ...commonHeaders };
      const sseHeaders: Record<string, string> = {
        ...commonHeaders,
        Accept: 'text/event-stream',
      };
      const hasAccessToken = Boolean(mcpServer.accessToken);
      const hasApiKey = Boolean(mcpServer.apiKey);
      const pref = mcpServer.authPreference ?? (hasAccessToken ? 'oauth' : (hasApiKey ? 'api-key' : undefined));
      let authLabel: 'bearer' | 'x-api-key' | 'none' = 'none';
      if (pref === 'oauth' && hasAccessToken) {
        httpHeaders.Authorization = `Bearer ${mcpServer.accessToken!}`;
        sseHeaders.Authorization = `Bearer ${mcpServer.accessToken!}`;
        authLabel = 'bearer';
      } else if (pref === 'api-key' && hasApiKey) {
        if (mcpServer.headerScheme === 'x-api-key') {
          httpHeaders['X-API-Key'] = mcpServer.apiKey!;
          sseHeaders['X-API-Key'] = mcpServer.apiKey!;
          authLabel = 'x-api-key';
        } else {
          httpHeaders.Authorization = `Bearer ${mcpServer.apiKey!}`;
          sseHeaders.Authorization = `Bearer ${mcpServer.apiKey!}`;
          authLabel = 'bearer';
        }
      } else if (hasAccessToken) {
        // Fallback: prefer OAuth when available
        httpHeaders.Authorization = `Bearer ${mcpServer.accessToken!}`;
        sseHeaders.Authorization = `Bearer ${mcpServer.accessToken!}`;
        authLabel = 'bearer';
      } else if (hasApiKey) {
        // Fallback: use API key with chosen scheme (default bearer)
        if (mcpServer.headerScheme === 'x-api-key') {
          httpHeaders['X-API-Key'] = mcpServer.apiKey!;
          sseHeaders['X-API-Key'] = mcpServer.apiKey!;
          authLabel = 'x-api-key';
        } else {
          httpHeaders.Authorization = `Bearer ${mcpServer.apiKey!}`;
          sseHeaders.Authorization = `Bearer ${mcpServer.apiKey!}`;
          authLabel = 'bearer';
        }
      }

      // Try Streamable HTTP first
      let connected = false;
      let shouldFallback = false;
      try {
        // Do not include sessionId on initialization; some servers reject it with HTTP 400 ("Initialization requests must not include a sessionId")
        const transport = new StreamableHTTPClientTransport(remoteMcpUrl, {
          requestInit: { headers: httpHeaders },
        });
        const client = await createMCPClient({ transport });

        // Probe connectivity so we can decide whether to fall back
        try {
          const previewTools = await client.tools();
          const toolCount = Object.keys(previewTools ?? {}).length;
          console.log(
            '[MCP] Connected via streamable-http:',
            url,
            'auth:',
            authLabel,
            'tools:',
            toolCount,
          );
          if (toolCount === 0) {
            console.warn('[MCP] streamable-http returned zero tools during probe for', safeOrigin(url));
          }
        } catch (previewErr: any) {
          if (isAuthError(previewErr)) {
            console.error(
              '[MCP] streamable-http auth error (tools probe) for',
              safeOrigin(url),
              'status:',
              errorCode(previewErr) ?? 'unknown',
              '- Verify Authorization: Bearer token validity and scopes.'
            );
          } else {
            console.error('[MCP] streamable-http tools() probe failed for', safeOrigin(url), previewErr?.message ?? previewErr);
          }
          throw previewErr;
        }
        mcpClients.push(client);
        connected = true;
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        const codeMatch = msg.match(/\b(\d{3})\b/);
        const httpCode = codeMatch ? Number(codeMatch[1]) : undefined;
        const initSessionIdHint = msg.includes('Initialization requests must not include a sessionId');
        if (initSessionIdHint) {
          console.warn(
            '[MCP] streamable-http rejected sessionId during init for',
            safeOrigin(url),
            'HTTP',
            httpCode ?? '400',
            '- sessionId removed; please retry the request.'
          );
        }
        shouldFallback =
          msg.includes('404') ||
          msg.includes('Not Found') ||
          msg.includes('405') ||
          msg.includes('Method Not Allowed');
        if (!shouldFallback) {
          console.warn('[MCP] streamable-http connect failed; skipping SSE fallback:', msg);
        } else {
          console.info('[MCP] streamable-http not supported, trying http+sse:', url);
        }
      }

      if (connected) continue;
      if (!shouldFallback) continue;

      // Fallback to legacy http+sse
      try {
        const sseTransport = new SSEClientTransport(remoteMcpUrl, { requestInit: { headers: sseHeaders } });
        const sseClient = await createMCPClient({ transport: sseTransport });

        // Probe connectivity
        try {
          const previewTools = await sseClient.tools();
          const toolCount = Object.keys(previewTools ?? {}).length;
          console.log(
            '[MCP] Connected via http+sse:',
            url,
            'auth:',
            authLabel,
            'tools:',
            toolCount,
          );
          if (toolCount === 0) {
            console.warn('[MCP] http+sse returned zero tools during probe for', safeOrigin(url));
          }
        } catch (previewErr: any) {
          if (isAuthError(previewErr)) {
            console.error(
              '[MCP] http+sse auth error (tools probe) for',
              safeOrigin(url),
              'status:',
              errorCode(previewErr) ?? 'unknown',
              '- Verify Authorization: Bearer token validity and scopes.'
            );
          } else {
            console.error('[MCP] http+sse tools() probe failed for', safeOrigin(url), previewErr?.message ?? previewErr);
          }
          throw previewErr;
        }
        mcpClients.push(sseClient);
      } catch (sseErr) {
        console.error('[MCP] Failed to connect via both streamable-http and http+sse:', url, sseErr);
      }
    }

    // Discover tools from all MCP clients and merge them (last-write-wins)
    const toolSets = await Promise.all(mcpClients.map(async (client) => {
      try {
        const tools = await client.tools();
        const toolKeys = Object.keys(tools ?? {});
        console.log('[MCP] tools fetched:', toolKeys.length);
        if (toolKeys.length === 0) {
          console.warn('[MCP] No tools reported by server; downstream calls may be unavailable.');
        }
        return tools;
      } catch (error) {
        if (isAuthError(error)) {
          console.error('Error fetching tools from MCP client (auth):', errorCode(error) ?? '401/403');
        } else {
          console.error('Error fetching tools from MCP client:', error instanceof Error ? error.message : error);
        }
        return {};
      }
    })) satisfies ToolSet[];
    const tools = Object.assign({}, ...toolSets) as ToolSet;

    const result = streamText({
      model: openrouter.chat(model),
      messages: [systemPrompt, ...convertToModelMessages(messages)],
      stopWhen: stepCountIs(5),
      tools,
      onFinish: async () => {
        await Promise.all(mcpClients.map(async (client) => {
          try {
            await client.close();
          } catch (error) {
            console.error('Error closing MCP client:', error);
          }
        }));
      },
    });
    return result.toUIMessageStreamResponse({
      sendReasoning: reasoning,
    });
  } catch (error: any) {
    // Ensure MCP clients are closed if an error occurs before streaming starts
    try {
      await Promise.all(mcpClients.map((client) => client.close()));
    } catch { }
    console.error('Chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export type ChatRouteType = typeof chatRoute;
