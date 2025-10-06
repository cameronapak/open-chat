import crypto from 'crypto';
import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

export type SessionData = {
  encryptedKey?: string;
  codeVerifier?: string;
};

export const sessionMap = new Map<string, SessionData>();

const COOKIE_NAME = 'sid';

function sign(value: string, secret: string) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(value);
  return hmac.digest('base64url');
}

function serialize(id: string, secret: string) {
  return `${id}.${sign(id, secret)}`;
}

function parseAndVerify(serialized: string, secret: string): string | null {
  const idx = serialized.lastIndexOf('.');
  if (idx <= 0) return null;
  const id = serialized.slice(0, idx);
  const sig = serialized.slice(idx + 1);
  const exp = sign(id, secret);
  if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) {
    return id;
  }
  return null;
}

export function getOrCreateSessionId(c: Context): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error('ENCRYPTION_SECRET not set');

  const cookie = getCookie(c, COOKIE_NAME);
  const dev = process.env.NODE_ENV === 'development';

  if (cookie) {
    const id = parseAndVerify(cookie, secret);
    if (id) {
      return id;
    }
  }

  const id = crypto.randomBytes(32).toString('base64url');
  const value = serialize(id, secret);
  setCookie(c, COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: !dev,
    path: '/',
  });

  return id;
}

export function getSession(c: Context): { id: string; data: SessionData } {
  const id = getOrCreateSessionId(c);
  let data = sessionMap.get(id);
  if (!data) {
    data = {};
    sessionMap.set(id, data);
  }
  return { id, data };
}

export function clearSessionData(c: Context) {
  const { id } = getSession(c);
  sessionMap.set(id, {});
}