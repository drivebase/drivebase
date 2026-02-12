import { env } from "../config/env";
import { EncryptionError } from "@drivebase/core";

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Import key
    const keyMaterial = encoder.encode(env.ENCRYPTION_KEY);
    const key = await crypto.subtle.importKey(
      "raw",
      await crypto.subtle.digest("SHA-256", keyMaterial),
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return base64 encoded
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    throw new EncryptionError("Failed to encrypt data", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Decode base64
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Import key
    const keyMaterial = encoder.encode(env.ENCRYPTION_KEY);
    const key = await crypto.subtle.importKey(
      "raw",
      await crypto.subtle.digest("SHA-256", keyMaterial),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );

    return decoder.decode(decrypted);
  } catch (error) {
    throw new EncryptionError("Failed to decrypt data", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Encrypt provider config object
 */
export async function encryptConfig(config: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify(config);
  return encrypt(json);
}

/**
 * Decrypt provider config object
 */
export async function decryptConfig(encryptedConfig: string): Promise<Record<string, unknown>> {
  const json = await decrypt(encryptedConfig);
  return JSON.parse(json);
}
