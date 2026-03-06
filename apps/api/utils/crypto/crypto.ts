import { EncryptionError } from "@drivebase/core";
import { env } from "../../config/env";

export async function encrypt(plaintext: string): Promise<string> {
	try {
		const encoder = new TextEncoder();
		const data = encoder.encode(plaintext);
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const keyMaterial = encoder.encode(env.ENCRYPTION_KEY);
		const key = await crypto.subtle.importKey(
			"raw",
			await crypto.subtle.digest("SHA-256", keyMaterial),
			{ name: "AES-GCM" },
			false,
			["encrypt"],
		);
		const encrypted = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv },
			key,
			data,
		);

		const combined = new Uint8Array(iv.length + encrypted.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(encrypted), iv.length);

		return btoa(String.fromCharCode(...combined));
	} catch (error) {
		throw new EncryptionError("Failed to encrypt data", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function decrypt(ciphertext: string): Promise<string> {
	try {
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();
		const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
		const iv = combined.slice(0, 12);
		const encrypted = combined.slice(12);
		const keyMaterial = encoder.encode(env.ENCRYPTION_KEY);
		const key = await crypto.subtle.importKey(
			"raw",
			await crypto.subtle.digest("SHA-256", keyMaterial),
			{ name: "AES-GCM" },
			false,
			["decrypt"],
		);
		const decrypted = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv },
			key,
			encrypted,
		);

		return decoder.decode(decrypted);
	} catch (error) {
		throw new EncryptionError("Failed to decrypt data", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function encryptConfig(
	config: Record<string, unknown>,
): Promise<string> {
	const json = JSON.stringify(config);
	return encrypt(json);
}

export async function decryptConfig(
	encryptedConfig: string,
): Promise<Record<string, unknown>> {
	const json = await decrypt(encryptedConfig);
	return JSON.parse(json);
}
