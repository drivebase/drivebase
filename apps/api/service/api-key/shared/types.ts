export interface CreateApiKeyInput {
	name: string;
	description?: string | null;
	scopes: string[];
	expiresAt?: Date | null;
}

export interface UpdateApiKeyInput {
	name?: string | null;
	description?: string | null;
}

export interface ApiKeyAuthResult {
	userId: string;
	email: string;
	role: string;
	scopes: string[];
}
