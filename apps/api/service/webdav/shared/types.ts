export interface WebDavProviderScopeInput {
	providerId: string;
	basePath?: string | null;
}

export interface WebDavProviderScope {
	providerId: string;
	basePath: string;
}

export interface CreateWebDavCredentialInput {
	userId: string;
	name: string;
	username: string;
	providerScopes: WebDavProviderScopeInput[];
}

export interface WebDavAuthResult {
	credentialId: string;
	workspaceId: string;
	userId: string;
	email: string;
	name: string;
	role: string;
	username: string;
	providerScopes: WebDavProviderScope[];
}

export interface WebDavResolvedProviderScope extends WebDavProviderScope {
	providerName: string;
	providerSegment: string;
}
