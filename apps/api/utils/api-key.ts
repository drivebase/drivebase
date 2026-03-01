import { createHash, randomBytes } from "node:crypto";

const PREFIX = "drv_";
const KEY_BYTES = 20; // 40 hex chars

export function generateApiKey(): {
	fullKey: string;
	keyHash: string;
	keyPrefix: string;
} {
	const raw = randomBytes(KEY_BYTES).toString("hex");
	const fullKey = `${PREFIX}${raw}`;
	return {
		fullKey,
		keyHash: hashApiKey(fullKey),
		keyPrefix: fullKey.slice(0, 12),
	};
}

export function hashApiKey(key: string): string {
	return createHash("sha256").update(key).digest("hex");
}

export function isApiKeyToken(token: string): boolean {
	return token.startsWith(PREFIX);
}
