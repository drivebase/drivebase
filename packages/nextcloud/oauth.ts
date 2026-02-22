import type { OAuthInitResult, ProviderConfig } from "@drivebase/core";
import { ProviderError } from "@drivebase/core";
import type { NextcloudConfig } from "./schema";
import { NextcloudConfigSchema } from "./schema";

function parseConfig(config: ProviderConfig): NextcloudConfig {
	const parsed = NextcloudConfigSchema.safeParse(config);
	if (!parsed.success) {
		throw new ProviderError("nextcloud", "Invalid Nextcloud configuration", {
			errors: parsed.error.errors,
		});
	}
	return parsed.data;
}

/**
 * Login Flow v2 token response from polling endpoint
 */
interface LoginFlowPollResult {
	server: string;
	loginName: string;
	appPassword: string;
}

/**
 * Login Flow v2 initiation response
 */
interface LoginFlowInitResult {
	poll: {
		token: string;
		endpoint: string;
	};
	login: string;
}

/**
 * Initiate Nextcloud Login Flow v2.
 *
 * POSTs to /index.php/login/v2 on the Nextcloud server.
 * Stores the poll token and endpoint in the returned config so that
 * pollOAuth() can later retrieve them from the encrypted DB config.
 *
 * Returns the login URL as authorizationUrl — the frontend opens this
 * in a popup window (NOT a full redirect, since Nextcloud won't redirect back).
 *
 * IMPORTANT: The returned state encodes the poll token and endpoint so the
 * API can persist them into the provider's config before the frontend starts polling.
 */
export async function initiateNextcloudOAuth(
	config: ProviderConfig,
	_callbackUrl: string,
	state: string,
): Promise<OAuthInitResult> {
	const { serverUrl } = parseConfig(config);

	const url = `${serverUrl.replace(/\/+$/, "")}/index.php/login/v2`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"User-Agent": "Drivebase",
		},
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`Failed to initiate Login Flow v2: ${response.status} ${response.statusText}`,
		);
	}

	const data = (await response.json()) as LoginFlowInitResult;

	if (!data.poll?.token || !data.poll?.endpoint || !data.login) {
		throw new ProviderError(
			"nextcloud",
			"Unexpected response from Nextcloud Login Flow v2",
		);
	}

	return {
		authorizationUrl: data.login,
		state,
		// Poll tokens are persisted to the provider's encrypted config by the API.
		// pollOAuth() will read them from there on each poll attempt.
		configUpdates: {
			_ncPollToken: data.poll.token,
			_ncPollEndpoint: data.poll.endpoint,
		},
	};
}

/**
 * handleNextcloudOAuthCallback is not used — Nextcloud Login Flow v2
 * doesn't redirect back. pollOAuth handles credential retrieval instead.
 */
export async function handleNextcloudOAuthCallback(
	_config: ProviderConfig,
	_code: string,
	_callbackUrl: string,
): Promise<ProviderConfig> {
	throw new ProviderError(
		"nextcloud",
		"Nextcloud uses Login Flow v2 polling, not OAuth redirect callbacks.",
	);
}

/**
 * Poll Nextcloud Login Flow v2 endpoint once.
 *
 * Reads _ncPollToken and _ncPollEndpoint from the stored config
 * (set during initiateOAuth and persisted by the API).
 *
 * Returns the updated config with username + appPassword on success,
 * or null if the user hasn't authenticated yet.
 */
export async function pollNextcloudOAuth(
	config: ProviderConfig,
): Promise<ProviderConfig | null> {
	const pollToken = config._ncPollToken as string | undefined;
	const pollEndpoint = config._ncPollEndpoint as string | undefined;

	if (!pollToken || !pollEndpoint) {
		throw new ProviderError(
			"nextcloud",
			"Missing poll token or endpoint in stored config — Login Flow was not properly initiated",
		);
	}

	const response = await fetch(pollEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: `token=${encodeURIComponent(pollToken)}`,
	});

	// 404 = user hasn't authenticated yet
	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`Login Flow v2 polling failed: ${response.status} ${response.statusText}`,
		);
	}

	const result = (await response.json()) as LoginFlowPollResult;

	if (!result.loginName || !result.appPassword) {
		throw new ProviderError(
			"nextcloud",
			"Login Flow v2 returned incomplete credentials",
		);
	}

	// Return updated config with credentials, removing poll fields
	return {
		...config,
		username: result.loginName,
		appPassword: result.appPassword,
		_ncPollToken: undefined,
		_ncPollEndpoint: undefined,
	};
}
