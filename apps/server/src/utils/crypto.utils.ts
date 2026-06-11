import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Pads or truncates the raw key to 32 bytes for AES-256.
 *
 * @param secretKey The secret key to pad.
 * @returns The 32-byte key Buffer.
 */
function getPaddedKey(secretKey: string): Buffer {
  const key = Buffer.from(secretKey, 'utf-8');
  const paddedKey = Buffer.alloc(32);
  key.copy(paddedKey);
  return paddedKey;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param text The plaintext string to encrypt.
 * @param secretKey The encryption key (must be 32 bytes or padded).
 * @returns The colon-separated encrypted token string (IV:ciphertext:authTag).
 */
export function encrypt(text: string, secretKey: string): string {
  try {
    const paddedKey = getPaddedKey(secretKey);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, paddedKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  } catch (err: any) {
    throw new Error(`Encryption failed: ${err.message}`);
  }
}

/**
 * Decrypts an AES-256-GCM encrypted token string.
 *
 * @param token The colon-separated encrypted token string (IV:ciphertext:authTag).
 * @param secretKey The decryption key (must be 32 bytes or padded).
 * @returns The decrypted plaintext string.
 */
export function decrypt(token: string, secretKey: string): string {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted credentials token format');
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
  } catch (err: any) {
    throw new Error(`Decryption failed: ${err.message}`);
  }
}

const VAULT_DEFAULT_KEY = 'moneyup-super-secret-vault-key-32b';
const USERS_DEFAULT_KEY = 'moneyup-super-secret-users-key-32b';

/**
 * Encrypts a vault plaintext string using the scraper vault key.
 */
export function encryptVault(text: string, secretKey?: string): string {
  const key = secretKey || process.env.VAULT_ENCRYPTION_KEY || VAULT_DEFAULT_KEY;
  return encrypt(text, key);
}

/**
 * Decrypts a vault ciphertext string using the scraper vault key.
 */
export function decryptVault(token: string, secretKey?: string): string {
  const key = secretKey || process.env.VAULT_ENCRYPTION_KEY || VAULT_DEFAULT_KEY;
  return decrypt(token, key);
}

/**
 * Encrypts a user config plaintext string using the users key.
 */
export function encryptUserConfig(text: string, secretKey?: string): string {
  const key = secretKey || process.env.USERS_ENCRYPTION_KEY || USERS_DEFAULT_KEY;
  return encrypt(text, key);
}

/**
 * Decrypts a user config ciphertext string using the users key.
 */
export function decryptUserConfig(token: string, secretKey?: string): string {
  const key = secretKey || process.env.USERS_ENCRYPTION_KEY || USERS_DEFAULT_KEY;
  return decrypt(token, key);
}

