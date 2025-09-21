import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { decrypt } from '../lib/crypto';

const modelsRouter = new Hono();

modelsRouter.get('/', async (c) => {
  try {
    const url = new URL('https://openrouter.ai/api/v1/models');
    const category = c.req.query('category');
    if (category) {
      url.searchParams.set('category', category);
    }

    // Optional auth via user-connected key stored in cookie
    const secret = process.env.ENCRYPTION_SECRET;
    const encryptedKey = getCookie(c, 'ork');
    const headers: Record<string, string> = {
      'accept': 'application/json',
    };
    if (secret && encryptedKey) {
      try {
        const apiKey = decrypt(encryptedKey, secret);
        if (apiKey) {
          headers['authorization'] = `Bearer ${apiKey}`;
        }
      } catch {
        // ignore, call unauthenticated
      }
    }

    const resp = await fetch(url, { headers });
    const text = await resp.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return c.json({ error: 'Invalid JSON from OpenRouter' }, 502);
    }
    if (!resp.ok) {
      const message = (data as any)?.error || (data as any)?.message || 'Failed to fetch models';
      return c.json({ error: message }, 502);
    }

    // Basic cache headers for intermediate caches
    c.header('Cache-Control', 'public, max-age=60'); // 1 minute
    return c.json(data);
  } catch (err) {
    console.error('Models fetch error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export { modelsRouter };