
/**
 * Simple client-side keystore for MCP API keys.
 * - Encrypts API keys at rest with AES-GCM via Web Crypto.
 * - Persists the AES key (JWK) in IndexedDB.
 * - Stores only ciphertext + iv in localStorage, keyed by canonical URL hash.
 * - Supports session-only (in-memory) storage for the current tab.
 *
 * NOTE: This improves at-rest security but cannot protect against XSS.
 */

const DB_NAME = 'openchat-keystore';
const DB_VERSION = 1;
const STORE_KEYS = 'keys';

// Session-only in-memory map (per tab)
const sessionOnlyMap = new Map<string, string>();

// Utility: base64 helpers
const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};
const fromBase64 = (b64: string) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

// Utility: canonicalize MCP URL (strip trailing slash except root, drop hash, keep search)
const canonicalizeUrl = (u: string | null | undefined): string | null => {
  if (!u) return null;
  try {
    const parsed = new URL(u);
    let pathname = parsed.pathname || '';
    if (pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search || ''}`;
  } catch {
    return null;
  }
};

// Utility: fast hash string → hex (matches style already used in client)
const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

const storageKeyForUrl = (u: string) => `mcp:ak_${hashString(u)}`;

// IndexedDB open
const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const readStore = async <T = any>(id: string): Promise<T | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, 'readonly');
    const store = tx.objectStore(STORE_KEYS);
    const getReq = store.get(id);
    getReq.onsuccess = () => resolve(getReq.result as T | undefined);
    getReq.onerror = () => reject(getReq.error);
  });
};

const writeStore = async (record: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, 'readwrite');
    const store = tx.objectStore(STORE_KEYS);
    const putReq = store.put(record);
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });
};

// AES-GCM key management (extractable for persistence via JWK; acceptable for POC)
const KEK_ID = 'kek-aesgcm-jwk';

const getOrCreateKEK = async (): Promise<CryptoKey> => {
  // Try load JWK from IndexedDB
  const existing = await readStore<{ id: string; jwk: JsonWebKey }>(KEK_ID);
  if (existing?.jwk) {
    return crypto.subtle.importKey(
      'jwk',
      existing.jwk,
      { name: 'AES-GCM' },
      true, // extractable (to allow re-persist if needed)
      ['encrypt', 'decrypt'],
    );
  }
  // Create new AES-GCM 256 key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable for JWK export
    ['encrypt', 'decrypt'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', key);
  await writeStore({ id: KEK_ID, jwk });
  return key;
};

// Encrypt/decrypt
export const encryptString = async (plaintext: string): Promise<{ c: string; iv: string }> => {
  const key = await getOrCreateKEK();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { c: toBase64(ct), iv: toBase64(iv.buffer) };
};

export const decryptString = async (payload: { c: string; iv: string }): Promise<string> => {
  const key = await getOrCreateKEK();
  const ivBuf = fromBase64(payload.iv);
  const ctBuf = fromBase64(payload.c);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
    key,
    ctBuf,
  );
  return new TextDecoder().decode(pt);
};

// Public API

export type HeaderScheme = 'authorization-bearer' | 'x-api-key';

export interface StoredApiKeyPayload {
  c: string; // ciphertext (base64)
  iv: string; // iv (base64)
}

export const saveApiKey = async (rawUrl: string, apiKey: string, persist: boolean): Promise<void> => {
  const canonical = canonicalizeUrl(rawUrl);
  if (!canonical) throw new Error('Invalid URL');
  const storageKey = storageKeyForUrl(canonical);

  if (persist) {
    const enc = await encryptString(apiKey);
    localStorage.setItem(storageKey, JSON.stringify(enc));
  } else {
    sessionOnlyMap.set(storageKey, apiKey);
  }
};

export const loadApiKey = async (rawUrl: string): Promise<string | undefined> => {
  const canonical = canonicalizeUrl(rawUrl);
  if (!canonical) return undefined;
  const storageKey = storageKeyForUrl(canonical);

  // Session-only first
  const mem = sessionOnlyMap.get(storageKey);
  if (mem) return mem;

  // Encrypted localStorage
  const raw = localStorage.getItem(storageKey);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as StoredApiKeyPayload;
    if (!parsed?.c || !parsed?.iv) return undefined;
    return await decryptString(parsed);
  } catch {
    return undefined;
  }
};

export const removeApiKey = (rawUrl: string): void => {
  const canonical = canonicalizeUrl(rawUrl);
  if (!canonical) return;
  const storageKey = storageKeyForUrl(canonical);
  sessionOnlyMap.delete(storageKey);
  localStorage.removeItem(storageKey);
};

export const hasStoredApiKey = (rawUrl: string): boolean => {
  const canonical = canonicalizeUrl(rawUrl);
  if (!canonical) return false;
  const storageKey = storageKeyForUrl(canonical);
  return sessionOnlyMap.has(storageKey) || !!localStorage.getItem(storageKey);
};

// Convenience helpers for UI

export const getApiKeyPresenceLabel = (rawUrl: string): 'session' | 'stored' | 'none' => {
  const canonical = canonicalizeUrl(rawUrl);
  if (!canonical) return 'none';
  const storageKey = storageKeyForUrl(canonical);
  if (sessionOnlyMap.has(storageKey)) return 'session';
  if (localStorage.getItem(storageKey)) return 'stored';
  return 'none';
};
