import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

export const FTPConfigSchema = z.object({
	host: z.string().min(1, "Host is required"),
	port: z.number().int().min(1).max(65535).optional().default(21),
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
	secure: z.boolean().optional().default(false),
	rootPath: z.string().optional(),
});

export type FTPConfig = z.infer<typeof FTPConfigSchema>;

// Fields encrypted at rest
export const FTPSensitiveFields = ["password"] as const;

// Fields shown to the user in the Connect Provider UI
export const FTPConfigFields: ProviderConfigField[] = [
	{
		name: "host",
		label: "Host",
		type: "text",
		required: true,
		description: "FTP server hostname or IP address",
		placeholder: "ftp.example.com",
	},
	{
		name: "port",
		label: "Port",
		type: "number",
		required: false,
		description: "FTP server port (default: 21)",
		placeholder: "21",
	},
	{
		name: "username",
		label: "Username",
		type: "text",
		required: true,
		description: "FTP account username",
		placeholder: "ftpuser",
	},
	{
		name: "password",
		label: "Password",
		type: "password",
		required: true,
		description: "FTP account password",
		placeholder: "••••••••",
	},
	{
		name: "secure",
		label: "Use FTPS (TLS)",
		type: "boolean",
		required: false,
		description:
			"Enable explicit FTPS (FTP over TLS) for encrypted connections",
	},
	{
		name: "rootPath",
		label: "Root Path",
		type: "text",
		required: false,
		description: "Optional root directory on the FTP server (e.g. /files)",
		placeholder: "/files",
	},
];
