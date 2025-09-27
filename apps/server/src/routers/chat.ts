import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { 
  streamText, 
  convertToModelMessages, 
  type UIMessage,
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClient as MCPClient
} from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { decrypt } from '@/lib/crypto';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { randomUUID } from 'node:crypto';

export const chatRouter = new Hono();

interface MCPServerConfig {
  id: string
  name: string
  url: string
  enabled: boolean
}

// Handle POST /api/chat
const chatRoute = chatRouter.post('/', async (c) => {
  const mcpClients: MCPClient[] = [];
  try {
    const body = await c.req.json().catch(() => ({}));
    const { messages, model, reasoning, mcpServers } : {
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

    // Initialize MCP clients (POC-fast; accepts client-supplied URLs)
    for (const mcpServer of mcpServers ?? []) {
      if (!mcpServer.enabled) continue;

      let url: URL | undefined;
      try {
        url = new URL(mcpServer.url);
      } catch (error) {
        console.error('Invalid MCP server URL:', mcpServer.url);
        continue;
      }
      if (!url) continue;

      const transport = new StreamableHTTPClientTransport(url, { sessionId: randomUUID() });
      const client = await createMCPClient({ transport });
      mcpClients.push(client);
    }

    // Discover tools from all MCP clients and merge them (last-write-wins)
    const toolSets = await Promise.all(mcpClients.map((client) => client.tools()));
    const tools = Object.assign({}, ...toolSets);

    const result = streamText({
      model: openrouter.chat(model),
      messages: convertToModelMessages(messages),
      tools,
      onFinish: async () => {
        await Promise.all(mcpClients.map((client) => client.close()));
      },
    });
    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    // Ensure MCP clients are closed if an error occurs before streaming starts
    try {
      await Promise.all(mcpClients.map((client) => client.close()));
    } catch {}
    console.error('Chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export type ChatRouteType = typeof chatRoute;
