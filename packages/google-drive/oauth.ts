import { google } from "googleapis";
import type { OAuthInitResult, ProviderConfig } from "@drivebase/core";
import { ProviderError } from "@drivebase/core";
import type { GoogleDriveConfig } from "./schema";
import { GoogleDriveConfigSchema } from "./schema";

const SCOPES = [
	// Access only files created or opened by this app — not the user's full Drive
	"https://www.googleapis.com/auth/drive.file",
	// Read Drive metadata (including storage quota) without full file-content access
	"https://www.googleapis.com/auth/drive.metadata.readonly",
];

function parseConfig(config: ProviderConfig): GoogleDriveConfig {
	const parsed = GoogleDriveConfigSchema.safeParse(config);
	if (!parsed.success) {
		throw new ProviderError(
			"google_drive",
			"Invalid Google Drive configuration",
			{
				errors: parsed.error.errors,
			},
		);
	}
	return parsed.data;
}

/**
 * Build an OAuth2 client from provider config.
 */
export function createOAuth2Client(
	clientId: string,
	clientSecret: string,
	redirectUri?: string,
) {
	return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Initiate the Google OAuth flow.
 * The caller provides the state (e.g. including provider ID for routing on callback).
 * The callbackUrl must be a fixed, pre-registered redirect URI in Google Cloud Console.
 */
export async function initiateGoogleOAuth(
	config: ProviderConfig,
	callbackUrl: string,
	state: string,
): Promise<OAuthInitResult> {
	const { clientId, clientSecret } = parseConfig(config);

	const oauth2Client = createOAuth2Client(clientId, clientSecret, callbackUrl);

	const authorizationUrl = oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: SCOPES,
		state,
		// Force consent screen so we always get a refresh token
		prompt: "consent",
	});

	return { authorizationUrl, state };
}

/**
 * Handle the OAuth callback: exchange the authorization code for tokens
 * and return the updated provider config with tokens populated.
 */
export async function handleGoogleOAuthCallback(
	config: ProviderConfig,
	code: string,
	callbackUrl: string,
): Promise<ProviderConfig> {
	const { clientId, clientSecret } = parseConfig(config);

	const oauth2Client = createOAuth2Client(clientId, clientSecret, callbackUrl);

	let tokens: { refresh_token?: string | null; access_token?: string | null };
	try {
		const response = await oauth2Client.getToken(code);
		tokens = response.tokens;
	} catch (error) {
		throw new ProviderError(
			"google_drive",
			"Failed to exchange authorization code for tokens",
			{
				error,
			},
		);
	}

	if (!tokens.refresh_token) {
		throw new ProviderError(
			"google_drive",
			"No refresh token returned — ensure the app requests offline access and the user granted consent",
		);
	}

	return {
		...config,
		refreshToken: tokens.refresh_token,
		accessToken: tokens.access_token ?? undefined,
	};
}
