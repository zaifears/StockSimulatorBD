// lib/seo/crypto.ts
// AES-256-GCM token encryption and decryption utility.
// Guarantees Google OAuth refresh tokens and sensitive credentials
// are NEVER stored in plaintext inside Firestore.

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getEncryptionKey(): Buffer {
  const secret = process.env.SEO_TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: Missing required SEO_TOKEN_ENCRYPTION_KEY environment variable. ' +
          'Generate a 32-byte key via `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"` and add it to Vercel Project Settings.'
      );
    }
    // Local development warning fallback (Never allowed in production)
    console.warn('[SEO Crypto] Warning: Using development encryption key. Ensure SEO_TOKEN_ENCRYPTION_KEY is set in production.');
    return crypto.createHash('sha256').update('stocksimulatorbd-local-dev-fallback-never-in-production').digest();
  }

  // Derive a 32-byte (256-bit) key using SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext token into a colon-delimited string (iv:authTag:ciphertext)
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a colon-delimited string (iv:authTag:ciphertext) back to plaintext
 */
export function decryptToken(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
