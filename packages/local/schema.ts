import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

export const LocalConfigSchema = z.object({
	rootPath: z.string().min(1, "Root path is required"),
});

export type LocalConfig = z.infer<typeof LocalConfigSchema>;

export const LocalSensitiveFields = [] as const;

export const LocalConfigFields: ProviderConfigField[] = [
	{
		name: "rootPath",
		label: "Root Path",
		type: "text",
		required: true,
		description: "Absolute path to storage directory",
		placeholder: "/var/lib/drivebase/storage",
	},
];
