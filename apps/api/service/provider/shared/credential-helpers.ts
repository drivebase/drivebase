import type { ProviderConfigField } from "@drivebase/core";
import { ValidationError } from "@drivebase/core";
import { getProviderRegistration } from "@/config/providers";

export function getIdentifierField(
	type: string,
	configFields: ProviderConfigField[],
): ProviderConfigField {
	const explicit = configFields.find((field) => field.isIdentifier);
	if (explicit) return explicit;

	const fallback = configFields.find(
		(field) => field.type === "text" || field.type === "number",
	);
	if (fallback) return fallback;

	throw new ValidationError(
		`Provider ${type} has no valid identifier field metadata`,
	);
}

export function parseAndValidateConfig(
	type: string,
	config: Record<string, unknown>,
) {
	const registration = getProviderRegistration(type);

	if (registration.authType !== "oauth") {
		throw new ValidationError(
			`${type} does not support reusable OAuth credentials`,
		);
	}

	const schema = registration.configSchema as {
		safeParse: (v: unknown) => {
			success: boolean;
			error?: { errors: unknown[] };
			data?: Record<string, unknown>;
		};
	};

	const validation = schema.safeParse(config);
	if (!validation.success || !validation.data) {
		throw new ValidationError("Invalid provider configuration", {
			errors: validation.error?.errors,
		});
	}

	return { registration, validatedConfig: validation.data };
}
