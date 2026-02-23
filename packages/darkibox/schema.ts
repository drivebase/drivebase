import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

export const DarkiboxConfigSchema = z.object({
	apiKey: z.string().min(1, "API key is required"),
});

export type DarkiboxConfig = z.infer<typeof DarkiboxConfigSchema>;

/** Fields encrypted at rest */
export const DarkiboxSensitiveFields = ["apiKey"] as const;

/** Fields shown in the Connect Provider UI */
export const DarkiboxConfigFields: ProviderConfigField[] = [
	{
		name: "apiKey",
		label: "API Key",
		type: "password",
		required: true,
		isIdentifier: true,
		description:
			"Your Darkibox API key. Found at darkibox.com under your account settings.",
		placeholder: "e.g. 45whzlc91xqdmqm58",
	},
];
