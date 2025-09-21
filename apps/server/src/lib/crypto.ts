import crypto from 'crypto';

/**
 * POC key derivation from a single server-held secret.
 * Uses PBKDF2 with fixed salt and iterations. For production, rotate keys and salts.
 */
function deriveKey(secret: string): Buffer {
  return crypto.pbkdf2Sync(secret, 'salt', 100000, 32, 'sha256');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Output format (base64): iv(12) + ciphertext + authTag(16)
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([iv, enc, tag]);
  return out.toString('base64');
}

/**
 * Decrypt value encrypted with encrypt() above.
 * Accepts base64(iv(12) + ciphertext + authTag(16))
 */
export function decrypt(encryptedBase64: string, secret: string): string {
  const key = deriveKey(secret);
  const combined = Buffer.from(encryptedBase64, 'base64');
  if (combined.length < 12 + 16) {
    throw new Error('Invalid payload');
  }
  const iv = combined.subarray(0, 12);
  const tag = combined.subarray(combined.length - 16);
  const enc = combined.subarray(12, combined.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}