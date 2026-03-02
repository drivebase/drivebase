export interface ApiKeyProviderScopeInput {
	providerId: string;
	basePath?: string | null;
}

export interface CreateApiKeyInput {
	name: string;
	description?: string | null;
	scopes: string[];
	providerScopes?: ApiKeyProviderScopeInput[] | null;
	expiresAt?: Date | null;
}

export interface UpdateApiKeyInput {
	name?: string | null;
	description?: string | null;
}

export interface ApiKeyProviderScope {
	providerId: string;
	basePath: string;
}

export interface ApiKeyAuthResult {
	userId: string;
	email: string;
	role: string;
	scopes: string[];
	providerScopes: ApiKeyProviderScope[] | null;
}
