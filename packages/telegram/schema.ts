import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

/**
 * Telegram provider configuration schema.
 *
 * At setup time only apiId + apiHash are required.
 * sessionString is populated after the phone/OTP auth flow completes.
 */
export const TelegramConfigSchema = z.object({
	/** Telegram API ID from my.telegram.org */
	apiId: z.coerce.number().int().positive("API ID is required"),
	/** Telegram API Hash from my.telegram.org */
	apiHash: z.string().min(1, "API Hash is required"),
	/** GramJS session string — present after auth flow completes */
	sessionString: z.string().optional(),
});

export type TelegramConfig = z.infer<typeof TelegramConfigSchema>;

/**
 * Fields that should be encrypted in storage
 */
export const TelegramSensitiveFields = ["apiHash", "sessionString"] as const;

/**
 * Configuration fields shown to the user when first connecting.
 * sessionString is NOT shown — it comes from the phone/OTP auth flow.
 */
export const TelegramConfigFields: ProviderConfigField[] = [
	{
		name: "apiId",
		label: "API ID",
		type: "number",
		required: true,
		isIdentifier: true,
		description: "Telegram API ID from my.telegram.org",
		placeholder: "12345678",
	},
	{
		name: "apiHash",
		label: "API Hash",
		type: "password",
		required: true,
		description: "Telegram API Hash from my.telegram.org",
		placeholder: "Enter API Hash",
	},
];
