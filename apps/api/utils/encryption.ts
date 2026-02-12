import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { env } from "../config/env";
import { EncryptionError } from "@drivebase/core";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive a 32-byte key from the encryption key
 */
function getKey(): Buffer {
  const key = env.ENCRYPTION_KEY;

  if (key.length < KEY_LENGTH) {
    throw new EncryptionError("ENCRYPTION_KEY must be at least 32 characters");
  }

  // Use first 32 bytes
  return Buffer.from(key.slice(0, KEY_LENGTH), "utf-8");
}

/**
 * Encrypt a value using AES-256-GCM
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    const ivHex = iv.toString("hex");
    const authTagHex = authTag.toString("hex");
    return `${ivHex}:${authTagHex}:${encrypted}`;
  } catch (error) {
    throw new EncryptionError("Failed to encrypt", { error });
  }
}

/**
 * Decrypt a value using AES-256-GCM
 */
export function decrypt(ciphertext: string): string {
  try {
    const key = getKey();
    const parts = ciphertext.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid ciphertext format");
    }

    const iv = Buffer.from(parts[0]!, "hex");
    const authTag = Buffer.from(parts[1]!, "hex");
    const encrypted = parts[2]!;

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new EncryptionError("Failed to decrypt", { error });
  }
}

/**
 * Encrypt provider configuration
 * Encrypts sensitive fields while preserving non-sensitive ones
 */
export function encryptConfig(
  config: Record<string, unknown>,
  sensitiveFields: readonly string[]
): string {
  const encryptedConfig: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (sensitiveFields.includes(key)) {
      // Encrypt sensitive field
      encryptedConfig[key] = encrypt(String(value));
    } else {
      // Keep non-sensitive field as-is
      encryptedConfig[key] = value;
    }
  }

  return JSON.stringify(encryptedConfig);
}

/**
 * Decrypt provider configuration
 * Decrypts sensitive fields while preserving non-sensitive ones
 */
export function decryptConfig(
  encryptedConfigJson: string,
  sensitiveFields: readonly string[]
): Record<string, unknown> {
  const encryptedConfig = JSON.parse(encryptedConfigJson) as Record<string, unknown>;
  const decryptedConfig: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(encryptedConfig)) {
    if (sensitiveFields.includes(key)) {
      // Decrypt sensitive field
      decryptedConfig[key] = decrypt(String(value));
    } else {
      // Keep non-sensitive field as-is
      decryptedConfig[key] = value;
    }
  }

  return decryptedConfig;
}
