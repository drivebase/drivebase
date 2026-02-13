import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

export const WebDAVConfigSchema = z.object({
	serverUrl: z.string().url("Server URL must be a valid URL"),
	username: z.string().optional(),
	password: z.string().optional(),
	rootPath: z.string().optional(),
});

export type WebDAVConfig = z.infer<typeof WebDAVConfigSchema>;

// Fields encrypted at rest
export const WebDAVSensitiveFields = ["password"] as const;

// Fields shown to the user in the Connect Provider UI
export const WebDAVConfigFields: ProviderConfigField[] = [
	{
		name: "serverUrl",
		label: "Server URL",
		type: "text",
		required: true,
		description: "Full URL to your WebDAV server",
		placeholder: "https://dav.example.com/remote.php/dav/files/user/",
	},
	{
		name: "username",
		label: "Username",
		type: "text",
		required: false,
		description: "WebDAV account username (leave blank for anonymous access)",
		placeholder: "admin",
	},
	{
		name: "password",
		label: "Password",
		type: "password",
		required: false,
		description: "WebDAV account password",
		placeholder: "••••••••",
	},
	{
		name: "rootPath",
		label: "Root Path",
		type: "text",
		required: false,
		description:
			"Optional subdirectory to scope all operations to (e.g. /files)",
		placeholder: "/files",
	},
];
