import { Hono } from 'hono';
import { streamText, convertToModelMessages } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { decrypt } from '../lib/crypto';
import { getCookie } from 'hono/cookie';

const chatRouter = new Hono();

// Handle POST /api/chat
chatRouter.post('/', async (c) => {
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

export { chatRouter };