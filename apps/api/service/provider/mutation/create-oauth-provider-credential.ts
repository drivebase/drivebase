import { ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { oauthProviderCredentials } from "@drivebase/db";
import { getSensitiveFields } from "@/config/providers";
import { encryptConfig } from "@/utils/encryption";
import {
	getIdentifierField,
	parseAndValidateConfig,
} from "../shared/credential-helpers";

// Create or update reusable OAuth credential record.
export async function createOAuthProviderCredential(
	db: Database,
	userId: string,
	type: string,
	config: Record<string, unknown>,
) {
	const { registration, validatedConfig } = parseAndValidateConfig(
		type,
		config,
	);
	const identifierField = getIdentifierField(type, registration.configFields);
	const identifierValue = String(
		validatedConfig[identifierField.name] ?? "",
	).trim();

	if (!identifierValue) {
		throw new ValidationError(
			`${identifierField.label} is required to save OAuth credentials`,
		);
	}

	const sensitiveFields = getSensitiveFields(type);
	const encryptedConfig = encryptConfig(validatedConfig, sensitiveFields);

	const [savedCredential] = await db
		.insert(oauthProviderCredentials)
		.values({
			type: type as
				| "google_drive"
				| "s3"
				| "local"
				| "dropbox"
				| "ftp"
				| "webdav"
				| "telegram",
			encryptedConfig,
			identifierLabel: identifierField.label,
			identifierValue,
			userId,
		})
		.onConflictDoUpdate({
			target: [
				oauthProviderCredentials.userId,
				oauthProviderCredentials.type,
				oauthProviderCredentials.identifierValue,
			],
			set: {
				encryptedConfig,
				identifierLabel: identifierField.label,
				updatedAt: new Date(),
			},
		})
		.returning();

	if (!savedCredential) {
		throw new Error("Failed to save OAuth provider credential");
	}

	return savedCredential;
}
