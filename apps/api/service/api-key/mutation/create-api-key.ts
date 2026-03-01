import type { Database } from "@drivebase/db";
import { apiKeys } from "@drivebase/db";
import { ValidationError } from "@drivebase/core";
import { generateApiKey } from "../../../utils/api-key";
import type { CreateApiKeyInput } from "../shared/types";

const VALID_SCOPES = ["read", "write", "admin"];

export async function createApiKey(
	db: Database,
	userId: string,
	input: CreateApiKeyInput,
) {
	if (!input.name.trim()) {
		throw new ValidationError("API key name is required");
	}

	const invalidScopes = input.scopes.filter((s) => !VALID_SCOPES.includes(s));
	if (input.scopes.length === 0 || invalidScopes.length > 0) {
		throw new ValidationError(
			`Invalid scopes. Allowed: ${VALID_SCOPES.join(", ")}`,
		);
	}

	const { fullKey, keyHash, keyPrefix } = generateApiKey();

	const [apiKey] = await db
		.insert(apiKeys)
		.values({
			name: input.name.trim(),
			description: input.description ?? null,
			keyHash,
			keyPrefix,
			scopes: input.scopes,
			userId,
			expiresAt: input.expiresAt ?? null,
		})
		.returning();

	if (!apiKey) throw new Error("Failed to create API key");

	return { apiKey, fullKey };
}
