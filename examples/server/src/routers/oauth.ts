import { Hono } from 'hono';
import crypto from 'crypto';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { encrypt } from '@/lib/crypto';

// @TODO - Convert this to Hono RPC

export const oauthRouter = new Hono();

// Helpers
function base64url(input: Buffer) {
  return input.toString('base64url');
}

function generateCodeVerifier(): string {
  return base64url(crypto.randomBytes(32));
}

function generateCodeChallengeS256(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64url(hash);
}

function getCallbackUrl(): string {
  // Prefer explicit CLIENT_URL if set, else derive from CORS_ORIGIN
  const webOrigin = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';
  return `${webOrigin.replace(/\/$/, '')}/callback`;
}

// Start the PKCE flow: returns authUrl
oauthRouter.post('/start', async (c) => {
  const verifier = generateCodeVerifier();
  const dev = process.env.NODE_ENV === 'development';
  // Store PKCE verifier in short-lived HttpOnly cookie
  setCookie(c, 'pkcv', verifier, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: !dev,
    path: '/',
    maxAge: 600, // 10 minutes
  });

  const challenge = generateCodeChallengeS256(verifier);
  const callbackUrl = getCallbackUrl();
  const authUrl =
    `https://openrouter.ai/auth?` +
    new URLSearchParams({
      callback_url: callbackUrl,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();

  return c.json({ authUrl });
});

// Exchange authorization code for user-controlled API key
oauthRouter.post('/exchange', async (c) => {
  const { code } = await c.req.json().catch(() => ({}));

  if (!code) {
    return c.json({ error: 'Missing code' }, 400);
  }

  const verifier = getCookie(c, 'pkcv');
  if (!verifier) {
    return c.json({ error: 'Missing code verifier' }, 400);
  }

  // Exchange with OpenRouter
  const resp = await fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      code_challenge_method: 'S256',
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return c.json({ error: err.message || 'OpenRouter exchange failed' }, 502);
  }

  const json = (await resp.json()) as { key?: string };
  if (!json.key) {
    return c.json({ error: 'No key returned from OpenRouter' }, 502);
  }

  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    return c.json({ error: 'Server not configured: ENCRYPTION_SECRET' }, 500);
  }

  // Encrypt and store in HttpOnly cookie for 30 days
  const encrypted = encrypt(json.key, secret);
  const dev = process.env.NODE_ENV === 'development';
  setCookie(c, 'ork', encrypted, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: !dev,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // Clear PKCE verifier cookie
  deleteCookie(c, 'pkcv', { path: '/', secure: !dev, sameSite: 'Lax' });

  return c.json({ connected: true });
});

// Disconnect and clear cookies
oauthRouter.post('/disconnect', async (c) => {
  const dev = process.env.NODE_ENV === 'development';
  deleteCookie(c, 'ork', { path: '/', secure: !dev, sameSite: 'Lax' });
  deleteCookie(c, 'pkcv', { path: '/', secure: !dev, sameSite: 'Lax' });
  return c.json({ ok: true });
});

// Status
oauthRouter.get('/status', async (c) => {
  const ork = getCookie(c, 'ork');
  return c.json({ connected: Boolean(ork) });
});