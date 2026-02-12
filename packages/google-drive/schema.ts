import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

/**
 * Google Drive provider configuration schema.
 *
 * At setup time only clientId + clientSecret are required.
 * refreshToken and accessToken are populated after the OAuth callback.
 */
export const GoogleDriveConfigSchema = z.object({
	/** OAuth 2.0 Client ID */
	clientId: z.string().min(1, "Client ID is required"),
	/** OAuth 2.0 Client Secret */
	clientSecret: z.string().min(1, "Client Secret is required"),
	/** OAuth 2.0 Refresh Token — present after OAuth callback */
	refreshToken: z.string().optional(),
	/** OAuth 2.0 Access Token — present after OAuth callback */
	accessToken: z.string().optional(),
});

export type GoogleDriveConfig = z.infer<typeof GoogleDriveConfigSchema>;

/**
 * Fields that should be encrypted in storage
 */
export const GoogleDriveSensitiveFields = [
	"clientSecret",
	"refreshToken",
	"accessToken",
] as const;

/**
 * Configuration fields shown to the user when first connecting.
 * Tokens are not entered manually — they are obtained via OAuth.
 */
export const GoogleDriveConfigFields: ProviderConfigField[] = [
	{
		name: "clientId",
		label: "Client ID",
		type: "text",
		required: true,
		description: "OAuth 2.0 Client ID from Google Cloud Console",
		placeholder: "Enter Client ID",
	},
	{
		name: "clientSecret",
		label: "Client Secret",
		type: "password",
		required: true,
		description: "OAuth 2.0 Client Secret from Google Cloud Console",
		placeholder: "Enter Client Secret",
	},
];
