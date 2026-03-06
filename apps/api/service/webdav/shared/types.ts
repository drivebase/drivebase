export interface WebDavProviderScopeInput {
	providerId: string;
	basePath?: string | null;
}

export interface WebDavProviderScope {
	providerId: string;
	basePath: string;
}

export interface CreateWebDavCredentialInput {
	name: string;
	username: string;
	providerScopes?: WebDavProviderScopeInput[] | null;
}

export interface WebDavAuthResult {
	credentialId: string;
	workspaceId: string;
	name: string;
	username: string;
	providerScopes: WebDavProviderScope[] | null;
}

export interface WebDavResolvedProviderScope extends WebDavProviderScope {
	providerName: string;
	providerSegment: string;
}
