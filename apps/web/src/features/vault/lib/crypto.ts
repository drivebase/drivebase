/**
 * Vault E2EE Crypto Library
 *
 * Pure, stateless module using the Web Crypto API. No external dependencies.
 *
 * Crypto design:
 * - P-256 ECDH keypair for asymmetric operations
 * - PBKDF2 (310k iterations, SHA-256) to derive KEK from passphrase
 * - AES-GCM 256-bit per-file symmetric keys
 * - ECIES (ephemeral ECDH + HKDF + AES-GCM) to wrap file keys
 * - Chunked files: deterministic IV per chunk (12-byte big-endian chunk index)
 */

const PBKDF2_ITERATIONS = 310_000;
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // bytes
const HKDF_INFO_STR = "drivebase-vault-file-key";
const _hkdfInfoRaw = new TextEncoder().encode(HKDF_INFO_STR);
const HKDF_INFO = new Uint8Array(new ArrayBuffer(_hkdfInfoRaw.byteLength));
_hkdfInfoRaw.forEach((b, i) => {
	HKDF_INFO[i] = b;
});

/** Helper to get a typed random Uint8Array<ArrayBuffer> for Web Crypto compatibility */
function randomBytes(length: number): Uint8Array<ArrayBuffer> {
	const buf = new ArrayBuffer(length);
	const view = new Uint8Array(buf);
	crypto.getRandomValues(view);
	return view as Uint8Array<ArrayBuffer>;
}

// ── Key Derivation ────────────────────────────────────────────────────────────

/**
 * Derive an AES-GCM key (KEK) from a passphrase using PBKDF2.
 */
export async function deriveKEK(
	passphrase: string,
	salt: Uint8Array,
): Promise<CryptoKey> {
	const passphraseKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(passphrase),
		"PBKDF2",
		false,
		["deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: salt.buffer as ArrayBuffer,
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		passphraseKey,
		{ name: "AES-GCM", length: AES_KEY_LENGTH },
		false,
		["encrypt", "decrypt"],
	);
}

// ── Keypair Generation ────────────────────────────────────────────────────────

/**
 * Generate a P-256 ECDH keypair.
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
	return crypto.subtle.generateKey(
		{ name: "ECDH", namedCurve: "P-256" },
		true,
		["deriveKey"],
	);
}

// ── Private Key Encryption ────────────────────────────────────────────────────

/**
 * Encrypt the private key with the KEK and return Base64(IV + ciphertext).
 * The private key is exported as JWK, serialised to JSON, then AES-GCM encrypted.
 */
export async function encryptPrivateKey(
	privateKey: CryptoKey,
	kek: CryptoKey,
): Promise<string> {
	const jwk = await crypto.subtle.exportKey("jwk", privateKey);
	const plaintext = new TextEncoder().encode(JSON.stringify(jwk));
	const iv = randomBytes(IV_LENGTH);

	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		kek,
		plaintext,
	);

	const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
	result.set(iv, 0);
	result.set(new Uint8Array(ciphertext), iv.byteLength);

	return bufferToBase64(result);
}

/**
 * Decrypt the private key. Returns a non-extractable ECDH key.
 * Throws if the passphrase (and thus KEK) is wrong.
 */
export async function decryptPrivateKey(
	encryptedData: string,
	kek: CryptoKey,
): Promise<CryptoKey> {
	const data = base64ToBuffer(encryptedData);
	const iv = data.slice(0, IV_LENGTH);
	const ciphertext = data.slice(IV_LENGTH);

	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		kek,
		ciphertext,
	);

	const jwk: JsonWebKey = JSON.parse(new TextDecoder().decode(plaintext));

	return crypto.subtle.importKey(
		"jwk",
		jwk,
		{ name: "ECDH", namedCurve: "P-256" },
		false,
		["deriveKey"],
	);
}

// ── File Key Generation & Wrapping ────────────────────────────────────────────

/**
 * Generate a random AES-GCM 256-bit file encryption key.
 */
export async function generateFileKey(): Promise<CryptoKey> {
	return crypto.subtle.generateKey(
		{ name: "AES-GCM", length: AES_KEY_LENGTH },
		true,
		["encrypt", "decrypt"],
	);
}

/**
 * Wrap a file key using ECIES:
 *   1. Generate ephemeral P-256 keypair
 *   2. ECDH between ephemeral private key and recipient public key → shared secret
 *   3. HKDF to derive AES-GCM wrapping key
 *   4. AES-GCM encrypt the file key material
 *
 * Returns Base64(ephemeralPubKeyRaw[65] + iv[12] + wrappedKey).
 */
export async function encryptFileKey(
	fileKey: CryptoKey,
	recipientPublicKey: CryptoKey,
): Promise<string> {
	// 1. Ephemeral keypair
	const ephemeral = await crypto.subtle.generateKey(
		{ name: "ECDH", namedCurve: "P-256" },
		true,
		["deriveKey"],
	);

	// 2. ECDH shared secret → AES-GCM wrapping key via HKDF
	const wrappingKey = await deriveWrappingKey(
		ephemeral.privateKey,
		recipientPublicKey,
	);

	// 3. Export file key as raw bytes
	const fileKeyRaw = await crypto.subtle.exportKey("raw", fileKey);

	// 4. AES-GCM wrap
	const iv = randomBytes(IV_LENGTH);
	const wrapped = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		wrappingKey,
		fileKeyRaw,
	);

	// 5. Export ephemeral public key as raw (65 bytes, uncompressed)
	const ephemeralPubRaw = await crypto.subtle.exportKey(
		"raw",
		ephemeral.publicKey,
	);

	// Concatenate: ephemeralPubKey(65) + iv(12) + wrapped
	const total = new Uint8Array(
		ephemeralPubRaw.byteLength + iv.byteLength + wrapped.byteLength,
	);
	total.set(new Uint8Array(ephemeralPubRaw), 0);
	total.set(iv, ephemeralPubRaw.byteLength);
	total.set(
		new Uint8Array(wrapped),
		ephemeralPubRaw.byteLength + iv.byteLength,
	);

	return bufferToBase64(total);
}

/**
 * Unwrap a file key using ECIES (reverse of encryptFileKey).
 */
export async function decryptFileKey(
	encryptedFileKey: string,
	privateKey: CryptoKey,
): Promise<CryptoKey> {
	const data = base64ToBuffer(encryptedFileKey);

	// P-256 uncompressed public key = 65 bytes
	const EPHEMERAL_PUB_LENGTH = 65;
	const ephemeralPubRaw = data.slice(0, EPHEMERAL_PUB_LENGTH);
	const iv = data.slice(EPHEMERAL_PUB_LENGTH, EPHEMERAL_PUB_LENGTH + IV_LENGTH);
	const wrapped = data.slice(EPHEMERAL_PUB_LENGTH + IV_LENGTH);

	// Import ephemeral public key
	const ephemeralPub = await crypto.subtle.importKey(
		"raw",
		ephemeralPubRaw,
		{ name: "ECDH", namedCurve: "P-256" },
		false,
		[],
	);

	// ECDH → wrapping key
	const wrappingKey = await deriveWrappingKey(privateKey, ephemeralPub);

	// AES-GCM unwrap
	const fileKeyRaw = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		wrappingKey,
		wrapped,
	);

	return crypto.subtle.importKey(
		"raw",
		fileKeyRaw,
		{ name: "AES-GCM" },
		false,
		["encrypt", "decrypt"],
	);
}

// ── File Encryption / Decryption ──────────────────────────────────────────────

/**
 * Encrypt a file buffer with a random IV.
 * Returns ArrayBuffer: iv(12) + ciphertext.
 */
export async function encryptFile(
	data: ArrayBuffer,
	fileKey: CryptoKey,
): Promise<ArrayBuffer> {
	const iv = randomBytes(IV_LENGTH);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		fileKey,
		data,
	);

	const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
	result.set(iv, 0);
	result.set(new Uint8Array(ciphertext), iv.byteLength);
	return result.buffer;
}

/**
 * Decrypt a file buffer. Expects iv(12) + ciphertext layout.
 */
export async function decryptFile(
	encryptedData: ArrayBuffer,
	fileKey: CryptoKey,
): Promise<ArrayBuffer> {
	const iv = encryptedData.slice(0, IV_LENGTH);
	const ciphertext = encryptedData.slice(IV_LENGTH);
	return crypto.subtle.decrypt({ name: "AES-GCM", iv }, fileKey, ciphertext);
}

// ── Chunk Encryption / Decryption ─────────────────────────────────────────────

/**
 * Encrypt a single chunk. IV is a deterministic 12-byte big-endian encoding of
 * the chunkIndex so decryption doesn't need a separate IV store.
 * Returns ArrayBuffer: iv(12) + ciphertext (28 bytes overhead total with AES-GCM tag).
 */
export async function encryptChunk(
	chunk: ArrayBuffer,
	fileKey: CryptoKey,
	chunkIndex: number,
): Promise<ArrayBuffer> {
	const iv = chunkIndexToIV(chunkIndex);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		fileKey,
		chunk,
	);

	const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
	result.set(iv, 0);
	result.set(new Uint8Array(ciphertext), iv.byteLength);
	return result.buffer;
}

/**
 * Decrypt a single chunk. Reconstructs IV from chunkIndex for verification.
 */
export async function decryptChunk(
	encryptedChunk: ArrayBuffer,
	fileKey: CryptoKey,
	chunkIndex: number,
): Promise<ArrayBuffer> {
	const expectedIV = chunkIndexToIV(chunkIndex);
	const iv = encryptedChunk.slice(0, IV_LENGTH);
	const ciphertext = encryptedChunk.slice(IV_LENGTH);

	// Verify IV matches expected chunk index
	const ivBytes = new Uint8Array(iv);
	const expectedBytes = new Uint8Array(expectedIV);
	for (let i = 0; i < IV_LENGTH; i++) {
		if (ivBytes[i] !== expectedBytes[i]) {
			throw new Error(`Chunk ${chunkIndex}: IV mismatch, possible tampering`);
		}
	}

	return crypto.subtle.decrypt({ name: "AES-GCM", iv }, fileKey, ciphertext);
}

// ── Key Fingerprint ───────────────────────────────────────────────────────────

/**
 * Compute a short fingerprint of the public key for display.
 * SHA-256 of canonical JWK JSON, first 32 hex chars.
 */
export async function getKeyFingerprint(
	publicKey: JsonWebKey,
): Promise<string> {
	const canonical = JSON.stringify(
		Object.keys(publicKey)
			.sort()
			.reduce<Record<string, unknown>>((acc, k) => {
				acc[k] = publicKey[k as keyof JsonWebKey];
				return acc;
			}, {}),
	);
	const hash = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(canonical),
	);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 32);
}

// ── Backup / Restore ──────────────────────────────────────────────────────────

export interface VaultBackup {
	version: 2;
	publicKey: JsonWebKey;
	encryptedPrivateKey: string;
	kekSalt: string;
	recoveryKey: string;
	recoveryEncryptedPrivateKey: string;
	createdAt: string;
}

/**
 * Generate a random 32-byte recovery key, returned as Base64.
 */
export function generateRecoveryKey(): string {
	return bufferToBase64(randomBytes(32));
}

/**
 * Encrypt the private key using a raw recovery key (base64-encoded 32 bytes).
 * The recovery key is imported as AES-GCM-256 raw material.
 */
export async function encryptPrivateKeyWithRecoveryKey(
	privateKey: CryptoKey,
	recoveryKeyB64: string,
): Promise<string> {
	const keyBytes = base64ToBuffer(recoveryKeyB64) as Uint8Array<ArrayBuffer>;
	const aesKey = await crypto.subtle.importKey(
		"raw",
		keyBytes,
		{ name: "AES-GCM", length: AES_KEY_LENGTH },
		false,
		["encrypt"],
	);

	const jwk = await crypto.subtle.exportKey("jwk", privateKey);
	const plaintext = new TextEncoder().encode(JSON.stringify(jwk));
	const iv = randomBytes(IV_LENGTH);

	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		aesKey,
		plaintext,
	);

	const result = new Uint8Array(iv.byteLength + ciphertext.byteLength);
	result.set(iv, 0);
	result.set(new Uint8Array(ciphertext), iv.byteLength);
	return bufferToBase64(result);
}

/**
 * Decrypt the private key using a raw recovery key (base64-encoded 32 bytes).
 */
export async function decryptPrivateKeyWithRecoveryKey(
	encryptedData: string,
	recoveryKeyB64: string,
): Promise<CryptoKey> {
	const keyBytes = base64ToBuffer(recoveryKeyB64) as Uint8Array<ArrayBuffer>;
	const aesKey = await crypto.subtle.importKey(
		"raw",
		keyBytes,
		{ name: "AES-GCM", length: AES_KEY_LENGTH },
		false,
		["decrypt"],
	);

	const data = base64ToBuffer(encryptedData);
	const iv = data.slice(0, IV_LENGTH);
	const ciphertext = data.slice(IV_LENGTH);

	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv },
		aesKey,
		ciphertext,
	);

	const jwk: JsonWebKey = JSON.parse(new TextDecoder().decode(plaintext));
	return crypto.subtle.importKey(
		"jwk",
		jwk,
		{ name: "ECDH", namedCurve: "P-256" },
		false,
		["deriveKey"],
	);
}

/**
 * Serialise vault key material to a JSON backup object (v2).
 */
export function createBackup(
	publicKey: JsonWebKey,
	encryptedPrivateKey: string,
	kekSalt: string,
	recoveryKey: string,
	recoveryEncryptedPrivateKey: string,
): VaultBackup {
	return {
		version: 2,
		publicKey,
		encryptedPrivateKey,
		kekSalt,
		recoveryKey,
		recoveryEncryptedPrivateKey,
		createdAt: new Date().toISOString(),
	};
}

/**
 * Parse and validate a backup JSON blob (v2 only).
 */
export function parseBackup(json: string): VaultBackup {
	const obj = JSON.parse(json) as Partial<VaultBackup>;
	if (
		obj.version !== 2 ||
		!obj.publicKey ||
		!obj.encryptedPrivateKey ||
		!obj.kekSalt ||
		!obj.recoveryKey ||
		!obj.recoveryEncryptedPrivateKey
	) {
		throw new Error("Invalid backup file format");
	}
	return obj as VaultBackup;
}

// ── JWK Helpers ───────────────────────────────────────────────────────────────

/**
 * Import a JWK public key as a CryptoKey.
 */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"jwk",
		jwk,
		{ name: "ECDH", namedCurve: "P-256" },
		true,
		[],
	);
}

/**
 * Export a CryptoKey as a JWK object.
 */
export async function exportPublicKeyAsJwk(
	key: CryptoKey,
): Promise<JsonWebKey> {
	return crypto.subtle.exportKey("jwk", key);
}

// ── Internal Helpers ──────────────────────────────────────────────────────────

/**
 * Derive AES-GCM wrapping key via ECDH + HKDF.
 */
async function deriveWrappingKey(
	privateKey: CryptoKey,
	publicKey: CryptoKey,
): Promise<CryptoKey> {
	const sharedSecret = await crypto.subtle.deriveKey(
		{ name: "ECDH", public: publicKey },
		privateKey,
		{ name: "HKDF" },
		false,
		["deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: new Uint8Array(new ArrayBuffer(32)),
			info: HKDF_INFO,
		},
		sharedSecret,
		{ name: "AES-GCM", length: AES_KEY_LENGTH },
		false,
		["encrypt", "decrypt"],
	);
}

/**
 * Encode a chunk index as a deterministic 12-byte big-endian Uint8Array.
 */
function chunkIndexToIV(index: number): Uint8Array<ArrayBuffer> {
	const iv = new Uint8Array(new ArrayBuffer(IV_LENGTH));
	// Write index as big-endian 64-bit into last 8 bytes of 12-byte IV
	// (first 4 bytes stay zero — index fits in 32 bits for practical file sizes)
	const view = new DataView(iv.buffer);
	view.setUint32(8, index, false); // big-endian
	return iv;
}

function bufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

// Re-export salt generation helper for convenience
export function generateSalt(): Uint8Array<ArrayBuffer> {
	return randomBytes(32);
}

export function saltToBase64(salt: Uint8Array): string {
	return bufferToBase64(salt);
}

export function base64ToSalt(b64: string): Uint8Array {
	return base64ToBuffer(b64);
}
