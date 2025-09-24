import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { streamText, convertToModelMessages } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { decrypt } from '@/lib/crypto';

export const chatRouter = new Hono();

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  model: z.string(),
});

// Handle POST /api/chat
const chatRoute = chatRouter.post('/', zValidator('json', chatSchema), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { messages, model } = body ?? {};

    if (!model) {
      return c.json({ error: 'Missing model' }, 400);
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
    const result = streamText({
      model: openrouter.chat(model),
      messages: convertToModelMessages(messages),
    });
    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export type ChatRouteType = typeof chatRoute;
