/**
 * @drivebase/telegram
 *
 * Telegram storage provider for Drivebase.
 * Uses Telegram's "Saved Messages" as cloud file storage.
 * Auth is handled via phone + OTP + optional 2FA (not standard OAuth).
 */

export {
	handleTelegramOAuthCallback,
	initiateTelegramOAuth,
} from "./oauth";
export { TelegramProvider } from "./provider";
export type { TelegramConfig } from "./schema";
export {
	TelegramConfigFields,
	TelegramConfigSchema,
	TelegramSensitiveFields,
} from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { handleTelegramOAuthCallback, initiateTelegramOAuth } from "./oauth";
import { TelegramProvider } from "./provider";
import { TelegramConfigFields, TelegramConfigSchema } from "./schema";

/**
 * Telegram provider registration.
 *
 * Auth type is "oauth" so the existing connect → initiateOAuth → callback
 * flow is reused, but the actual auth page is our own /connect/telegram
 * instead of an external OAuth consent screen.
 */
export const telegramRegistration: ProviderRegistration = {
	factory: () => new TelegramProvider(),
	configSchema: TelegramConfigSchema,
	configFields: TelegramConfigFields,
	description: "Telegram cloud storage via Saved Messages",
	supportsPresignedUrls: false,
	authType: "oauth",
	initiateOAuth: initiateTelegramOAuth,
	handleOAuthCallback: handleTelegramOAuthCallback,
};
