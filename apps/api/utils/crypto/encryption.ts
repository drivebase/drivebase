import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { EncryptionError } from "@drivebase/core";
import { env } from "../../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const _AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
	const key = env.ENCRYPTION_KEY;

	if (key.length < KEY_LENGTH) {
		throw new EncryptionError("ENCRYPTION_KEY must be at least 32 characters");
	}

	return Buffer.from(key.slice(0, KEY_LENGTH), "utf-8");
}

export function encrypt(plaintext: string): string {
	try {
		const key = getKey();
		const iv = randomBytes(IV_LENGTH);
		const cipher = createCipheriv(ALGORITHM, key, iv);

		let encrypted = cipher.update(plaintext, "utf8", "hex");
		encrypted += cipher.final("hex");

		const authTag = cipher.getAuthTag();
		const ivHex = iv.toString("hex");
		const authTagHex = authTag.toString("hex");
		return `${ivHex}:${authTagHex}:${encrypted}`;
	} catch (error) {
		throw new EncryptionError("Failed to encrypt", { error });
	}
}

export function decrypt(ciphertext: string): string {
	try {
		const key = getKey();
		const parts = ciphertext.split(":");

		if (parts.length !== 3) {
			throw new Error("Invalid ciphertext format");
		}

		const [ivHex, authTagHex, encrypted] = parts;
		if (!ivHex || !authTagHex || !encrypted) {
			throw new Error("Invalid ciphertext components");
		}

		const iv = Buffer.from(ivHex, "hex");
		const authTag = Buffer.from(authTagHex, "hex");

		const decipher = createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		let decrypted = decipher.update(encrypted, "hex", "utf8");
		decrypted += decipher.final("utf8");

		return decrypted;
	} catch (error) {
		throw new EncryptionError("Failed to decrypt", { error });
	}
}

export function encryptConfig(
	config: Record<string, unknown>,
	sensitiveFields: readonly string[],
): string {
	const encryptedConfig: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(config)) {
		if (sensitiveFields.includes(key)) {
			encryptedConfig[key] = encrypt(String(value));
		} else {
			encryptedConfig[key] = value;
		}
	}

	return JSON.stringify(encryptedConfig);
}

export function decryptConfig(
	encryptedConfigJson: string,
	sensitiveFields: readonly string[],
): Record<string, unknown> {
	const encryptedConfig = JSON.parse(encryptedConfigJson) as Record<
		string,
		unknown
	>;
	const decryptedConfig: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(encryptedConfig)) {
		if (sensitiveFields.includes(key)) {
			decryptedConfig[key] = decrypt(String(value));
		} else {
			decryptedConfig[key] = value;
		}
	}

	return decryptedConfig;
}
