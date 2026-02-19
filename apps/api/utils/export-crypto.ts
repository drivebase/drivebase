import { createCipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const SCRYPT_COST = 16384;

export const EXPORT_MAGIC = Buffer.from("DRBX");
export const EXPORT_VERSION = 1;

/**
 * Encrypt a JSON string with a user-provided password using AES-256-GCM.
 *
 * Binary format:
 *   DRBX (4B) + version (1B) + salt (16B) + IV (16B) + authTag (16B) + ciphertext
 */
export function encryptWithPassword(
	jsonString: string,
	password: string,
): Buffer {
	const salt = randomBytes(SALT_LENGTH);
	const key = scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_COST });
	const iv = randomBytes(IV_LENGTH);

	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(jsonString, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return Buffer.concat([
		EXPORT_MAGIC,
		Buffer.from([EXPORT_VERSION]),
		salt,
		iv,
		authTag,
		encrypted,
	]);
}
