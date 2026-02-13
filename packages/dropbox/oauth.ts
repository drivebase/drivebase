import type { OAuthInitResult, ProviderConfig } from "@drivebase/core";
import { ProviderError } from "@drivebase/core";
import type { DropboxConfig } from "./schema";
import { DropboxConfigSchema } from "./schema";

const AUTHORIZE_URL = "https://www.dropbox.com/oauth2/authorize";
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";

function parseConfig(config: ProviderConfig): DropboxConfig {
	const parsed = DropboxConfigSchema.safeParse(config);
	if (!parsed.success) {
		throw new ProviderError("dropbox", "Invalid Dropbox configuration", {
			errors: parsed.error.errors,
		});
	}
	return parsed.data;
}

/**
 * Initiate the Dropbox OAuth flow.
 * Requests offline access so a refresh token is issued.
 */
export async function initiateDropboxOAuth(
	config: ProviderConfig,
	callbackUrl: string,
	state: string,
): Promise<OAuthInitResult> {
	const { appKey } = parseConfig(config);

	const params = new URLSearchParams({
		client_id: appKey,
		response_type: "code",
		redirect_uri: callbackUrl,
		state,
		token_access_type: "offline",
	});

	const authorizationUrl = `${AUTHORIZE_URL}?${params.toString()}`;

	return { authorizationUrl, state };
}

/**
 * Handle the OAuth callback: exchange the authorization code for tokens
 * and return the updated provider config with tokens populated.
 */
export async function handleDropboxOAuthCallback(
	config: ProviderConfig,
	code: string,
	callbackUrl: string,
): Promise<ProviderConfig> {
	const { appKey, appSecret } = parseConfig(config);

	const body = new URLSearchParams({
		code,
		grant_type: "authorization_code",
		redirect_uri: callbackUrl,
		client_id: appKey,
		client_secret: appSecret,
	});

	let tokens: { refresh_token?: string; access_token?: string };

	try {
		const response = await fetch(TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});

		if (!response.ok) {
			const text = await response.text();
			throw new ProviderError(
				"dropbox",
				`Token exchange failed: ${response.status} ${text}`,
			);
		}

		tokens = (await response.json()) as {
			refresh_token?: string;
			access_token?: string;
		};
	} catch (error) {
		if (error instanceof ProviderError) throw error;
		throw new ProviderError(
			"dropbox",
			"Failed to exchange authorization code for tokens",
			{ error },
		);
	}

	if (!tokens.refresh_token) {
		throw new ProviderError(
			"dropbox",
			"No refresh token returned — ensure the app requests offline access (token_access_type=offline)",
		);
	}

	return {
		...config,
		refreshToken: tokens.refresh_token,
		accessToken: tokens.access_token,
	};
}

/**
 * Refresh the access token using the stored refresh token.
 */
export async function refreshDropboxToken(
	appKey: string,
	appSecret: string,
	refreshToken: string,
): Promise<string> {
	const body = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: refreshToken,
		client_id: appKey,
		client_secret: appSecret,
	});

	const response = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new ProviderError(
			"dropbox",
			`Token refresh failed: ${response.status} ${text}`,
		);
	}

	const data = (await response.json()) as { access_token?: string };

	if (!data.access_token) {
		throw new ProviderError("dropbox", "No access token returned from refresh");
	}

	return data.access_token;
}
