import { CryptoError } from "./errors.ts";

/** Shape persisted to the DB (e.g. `providers.credentials`, `oauth_apps.client_secret`). */
export type Ciphertext = { iv: string; tag: string; ct: string };

const ALGO = "AES-GCM";
const IV_BYTES = 12;

async function importKey(masterKeyBase64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(Buffer.from(masterKeyBase64, "base64"));
  if (raw.byteLength !== 32) {
    throw new CryptoError("master key must be 32 bytes (base64)");
  }
  return await crypto.subtle.importKey(
    "raw",
    raw,
    { name: ALGO },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a UTF-8 plaintext string to a DB-shaped blob. */
export async function encryptString(
  masterKeyBase64: string,
  plaintext: string,
): Promise<Ciphertext> {
  const key = await importKey(masterKeyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  const ctBuf = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: ALGO, iv: iv },
      key,
      encoded,
    ),
  );
  // WebCrypto appends the 16-byte GCM tag to the ciphertext; split to
  // store separately for clarity in audits.
  const tag = ctBuf.slice(ctBuf.length - 16);
  const ct = ctBuf.slice(0, ctBuf.length - 16);
  return {
    iv: Buffer.from(iv).toString("base64"),
    tag: Buffer.from(tag).toString("base64"),
    ct: Buffer.from(ct).toString("base64"),
  };
}

/** Decrypt a DB-shaped blob to its original string. */
export async function decryptString(
  masterKeyBase64: string,
  blob: Ciphertext,
): Promise<string> {
  const key = await importKey(masterKeyBase64);
  const iv = Uint8Array.from(Buffer.from(blob.iv, "base64"));
  const ct = Uint8Array.from(Buffer.from(blob.ct, "base64"));
  const tag = Uint8Array.from(Buffer.from(blob.tag, "base64"));
  const joined = new Uint8Array(ct.length + tag.length);
  joined.set(ct, 0);
  joined.set(tag, ct.length);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: ALGO, iv: iv },
      key,
      joined,
    );
    return new TextDecoder().decode(plain);
  } catch (e) {
    throw new CryptoError("decrypt failed (key mismatch or tampered blob)", e);
  }
}

/** Convenience: encrypt a JSON-serializable object. */
export async function encryptJson(
  masterKeyBase64: string,
  value: unknown,
): Promise<Ciphertext> {
  return encryptString(masterKeyBase64, JSON.stringify(value));
}

export async function decryptJson<T>(
  masterKeyBase64: string,
  blob: Ciphertext,
): Promise<T> {
  return JSON.parse(await decryptString(masterKeyBase64, blob)) as T;
}
