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
import { randomUUID } from 'node:crypto';

interface MCPServerConfig {
  id: string
  name: string
  url: string
  enabled: boolean
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
  `,
} as ModelMessage;

export const chatRouter = new Hono();

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
    // Initialize MCP clients (POC-fast; accepts client-supplied URLs)
    for (const mcpServer of mcpServers ?? []) {
      if (!mcpServer.enabled) continue;

      const url = mcpServer.url;
      if (!url) continue;
      const remoteMcpUrl = new URL(url);

      const transport = new StreamableHTTPClientTransport(remoteMcpUrl, { 
        sessionId: randomUUID(),
      });
      const client = await createMCPClient({ transport });
      mcpClients.push(client);
    }

    // Discover tools from all MCP clients and merge them (last-write-wins)
    const toolSets = await Promise.all(mcpClients.map(async (client) => {
      try {
        const tools = await client.tools();
        return tools;
      } catch (error) {
        console.error('Error fetching tools from MCP client:', error);
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
