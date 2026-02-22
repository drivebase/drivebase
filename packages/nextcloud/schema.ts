import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

export const NextcloudConfigSchema = z.object({
	serverUrl: z.string().url("Server URL must be a valid URL"),
	// Populated after Login Flow v2 completes
	username: z.string().optional(),
	appPassword: z.string().optional(),
	// Internal: Login Flow v2 poll state (set during initiateOAuth, cleared after pollOAuth succeeds)
	_ncPollToken: z.string().optional(),
	_ncPollEndpoint: z.string().optional(),
});

export type NextcloudConfig = z.infer<typeof NextcloudConfigSchema>;

// Fields encrypted at rest
export const NextcloudSensitiveFields = [
	"appPassword",
	"_ncPollToken",
] as const;

// Fields shown in the Connect Provider UI (only serverUrl — credentials come from Login Flow)
export const NextcloudConfigFields: ProviderConfigField[] = [
	{
		name: "serverUrl",
		label: "Server URL",
		type: "text",
		required: true,
		isIdentifier: true,
		description: "Base URL of your Nextcloud instance",
		placeholder: "https://cloud.example.com",
	},
];
