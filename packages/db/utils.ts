import { customAlphabet } from "nanoid";

/**
 * Generate a unique ID for database records
 * Uses nanoid with custom alphabet (URL-safe, no lookalikes)
 */
const nanoid = customAlphabet(
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
	21,
);

export function createId(): string {
	return nanoid();
}
