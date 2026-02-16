import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

/**
 * Dropbox provider configuration schema.
 *
 * At setup time only appKey + appSecret are required.
 * refreshToken and accessToken are populated after the OAuth callback.
 */
export const DropboxConfigSchema = z.object({
	/** Dropbox app key (client ID) */
	appKey: z.string().min(1, "App Key is required"),
	/** Dropbox app secret (client secret) */
	appSecret: z.string().min(1, "App Secret is required"),
	/** OAuth 2.0 refresh token — present after OAuth callback */
	refreshToken: z.string().optional(),
	/** OAuth 2.0 access token — present after OAuth callback */
	accessToken: z.string().optional(),
});

export type DropboxConfig = z.infer<typeof DropboxConfigSchema>;

/**
 * Fields that should be encrypted in storage
 */
export const DropboxSensitiveFields = [
	"appSecret",
	"refreshToken",
	"accessToken",
] as const;

/**
 * Configuration fields shown to the user when first connecting.
 * Tokens are not entered manually — they are obtained via OAuth.
 */
export const DropboxConfigFields: ProviderConfigField[] = [
	{
		name: "appKey",
		label: "App Key",
		type: "text",
		required: true,
		isIdentifier: true,
		description: "Dropbox app key from the Dropbox App Console",
		placeholder: "Enter App Key",
	},
	{
		name: "appSecret",
		label: "App Secret",
		type: "password",
		required: true,
		description: "Dropbox app secret from the Dropbox App Console",
		placeholder: "Enter App Secret",
	},
];
