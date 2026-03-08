import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

export const SambaConfigSchema = z.object({
	host: z.string().min(1, "Host is required"),
	share: z.string().min(1, "Share name is required"),
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
	domain: z.string().optional(),
	port: z.preprocess(
		(v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
		z.number().int().min(1).max(65535).optional().default(445),
	),
	rootPath: z.string().optional(),
});

export type SambaConfig = z.infer<typeof SambaConfigSchema>;

export const SambaSensitiveFields = ["password"] as const;

export const SambaConfigFields: ProviderConfigField[] = [
	{
		name: "host",
		label: "Host",
		type: "text",
		required: true,
		description: "SMB server hostname or IP address",
		placeholder: "192.168.1.100",
	},
	{
		name: "share",
		label: "Share Name",
		type: "text",
		required: true,
		description: "SMB share name",
		placeholder: "myshare",
	},
	{
		name: "username",
		label: "Username",
		type: "text",
		required: true,
		description: "SMB account username",
		placeholder: "smbuser",
	},
	{
		name: "password",
		label: "Password",
		type: "password",
		required: true,
		description: "SMB account password",
		placeholder: "••••••••",
	},
	{
		name: "domain",
		label: "Domain",
		type: "text",
		required: false,
		description: "Windows domain or workgroup (optional)",
		placeholder: "WORKGROUP (leave empty for local users)",
	},
	{
		name: "port",
		label: "Port",
		type: "number",
		required: false,
		description: "SMB server port (default: 445)",
		placeholder: "445",
	},
	{
		name: "rootPath",
		label: "Root Path",
		type: "text",
		required: false,
		description: "Optional root directory within the share (e.g. /files)",
		placeholder: "/files",
	},
];
