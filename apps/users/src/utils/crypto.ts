import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const DEFAULT_KEY = 'moneyup-super-secret-users-key-32b';

function getPaddedKey(secretKey?: string): Buffer {
  const rawKey = secretKey || process.env.USERS_ENCRYPTION_KEY || DEFAULT_KEY;
  const key = Buffer.from(rawKey, 'utf-8');
  const paddedKey = Buffer.alloc(32);
  key.copy(paddedKey);
  return paddedKey;
}

export function encrypt(text: string, secretKey?: string): string {
  const paddedKey = getPaddedKey(secretKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, paddedKey, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decrypt(token: string, secretKey?: string): string {
  const parts = token.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, encryptedHex, authTagHex] = parts;
  const paddedKey = getPaddedKey(secretKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, paddedKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
