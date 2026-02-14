import { ProviderError } from "@drivebase/core";
import { Api, TelegramClient } from "telegram";
import { computeCheck } from "telegram/Password";
import { StringSession } from "telegram/sessions";
import { logger } from "../utils/logger";

interface PendingAuth {
	client: TelegramClient;
	phoneCodeHash: string;
	phone: string;
	createdAt: number;
}

/** In-memory store for pending Telegram auth sessions, keyed by providerId */
const pendingAuths = new Map<string, PendingAuth>();

/** TTL for pending auth sessions (5 minutes) */
const AUTH_TTL_MS = 5 * 60 * 1000;

/** Clean up expired sessions periodically */
function cleanupExpired() {
	const now = Date.now();
	for (const [key, auth] of pendingAuths) {
		if (now - auth.createdAt > AUTH_TTL_MS) {
			auth.client.disconnect().catch(() => {});
			pendingAuths.delete(key);
		}
	}
}

// Run cleanup every 60 seconds
// setInterval(cleanupExpired, 60_000);

/**
 * Step 1: Send verification code to phone number.
 * Creates a temporary GramJS client and sends the OTP.
 */
export async function sendCode(
	providerId: string,
	apiId: number,
	apiHash: string,
	phone: string,
): Promise<{ phoneCodeHash: string }> {
	// Clean up any previous pending auth for this provider
	const existing = pendingAuths.get(providerId);
	if (existing) {
		existing.client.disconnect().catch(() => {});
		pendingAuths.delete(providerId);
	}

	const session = new StringSession("");
	const client = new TelegramClient(session, apiId, apiHash, {
		connectionRetries: 3,
	});

	await client.connect();

	try {
		const result = await client.sendCode({ apiId, apiHash }, phone);

		pendingAuths.set(providerId, {
			client,
			phoneCodeHash: result.phoneCodeHash,
			phone,
			createdAt: Date.now(),
		});

		return { phoneCodeHash: result.phoneCodeHash };
	} catch (error) {
		await client.disconnect().catch(() => {});
		logger.error({ msg: "Telegram sendCode failed", error });
		throw new ProviderError("telegram", "Failed to send verification code", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Step 2: Verify the OTP code.
 * Returns the session string on success, or signals that 2FA is required.
 */
export async function verifyCode(
	providerId: string,
	code: string,
): Promise<{ sessionString?: string; requires2FA?: boolean }> {
	const pending = pendingAuths.get(providerId);
	if (!pending) {
		throw new ProviderError(
			"telegram",
			"No pending auth session found. Please start over.",
		);
	}

	try {
		await pending.client.invoke(
			new Api.auth.SignIn({
				phoneNumber: pending.phone,
				phoneCodeHash: pending.phoneCodeHash,
				phoneCode: code,
			}),
		);

		// Sign-in succeeded — extract session string
		const sessionString = pending.client.session.save() as unknown as string;
		await pending.client.disconnect().catch(() => {});
		pendingAuths.delete(providerId);

		return { sessionString };
	} catch (error) {
		// Check if 2FA is required
		if (
			error instanceof Error &&
			error.message.includes("SESSION_PASSWORD_NEEDED")
		) {
			return { requires2FA: true };
		}

		// Other error — cleanup
		await pending.client.disconnect().catch(() => {});
		pendingAuths.delete(providerId);
		logger.error({ msg: "Telegram verifyCode failed", error });
		throw new ProviderError("telegram", "Failed to verify code", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Step 3 (optional): Verify 2FA password.
 * Returns the session string on success.
 */
export async function verify2FA(
	providerId: string,
	password: string,
): Promise<{ sessionString: string }> {
	const pending = pendingAuths.get(providerId);
	if (!pending) {
		throw new ProviderError(
			"telegram",
			"No pending auth session found. Please start over.",
		);
	}

	try {
		const passwordResult = await pending.client.invoke(
			new Api.account.GetPassword(),
		);

		const srpCheck = await computeCheck(passwordResult, password);

		await pending.client.invoke(
			new Api.auth.CheckPassword({ password: srpCheck }),
		);

		const sessionString = pending.client.session.save() as unknown as string;
		await pending.client.disconnect().catch(() => {});
		pendingAuths.delete(providerId);

		return { sessionString };
	} catch (error) {
		await pending.client.disconnect().catch(() => {});
		pendingAuths.delete(providerId);
		logger.error({ msg: "Telegram verify2FA failed", error });
		throw new ProviderError("telegram", "Failed to verify 2FA password", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
