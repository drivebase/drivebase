import type { ProviderConfigField } from "@drivebase/core";
import { NotFoundError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { oauthProviderCredentials } from "@drivebase/db";
import { and, desc, eq } from "drizzle-orm";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "../../config/providers";
import { decryptConfig, encryptConfig } from "../../utils/encryption";

function getIdentifierField(
	type: string,
	configFields: ProviderConfigField[],
): ProviderConfigField {
	const explicitIdentifier = configFields.find((field) => field.isIdentifier);
	if (explicitIdentifier) {
		return explicitIdentifier;
	}

	const firstTextOrNumber = configFields.find(
		(field) => field.type === "text" || field.type === "number",
	);

	if (firstTextOrNumber) {
		return firstTextOrNumber;
	}

	throw new ValidationError(
		`Provider ${type} has no valid identifier field metadata`,
	);
}

function parseAndValidateConfig(type: string, config: Record<string, unknown>) {
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

	return {
		registration,
		validatedConfig: validation.data,
	};
}

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
	const identifierRaw = validatedConfig[identifierField.name];
	const identifierValue = String(identifierRaw ?? "").trim();

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

export async function listOAuthProviderCredentials(
	db: Database,
	userId: string,
	type: string,
) {
	const registration = getProviderRegistration(type);

	if (registration.authType !== "oauth") {
		throw new ValidationError(
			`${type} does not support reusable OAuth credentials`,
		);
	}

	return db
		.select()
		.from(oauthProviderCredentials)
		.where(
			and(
				eq(oauthProviderCredentials.userId, userId),
				eq(
					oauthProviderCredentials.type,
					type as
						| "google_drive"
						| "s3"
						| "local"
						| "dropbox"
						| "ftp"
						| "webdav"
						| "telegram",
				),
			),
		)
		.orderBy(desc(oauthProviderCredentials.createdAt));
}

export async function getOAuthCredentialConfig(
	db: Database,
	credentialId: string,
	userId: string,
	type: string,
) {
	const [credential] = await db
		.select()
		.from(oauthProviderCredentials)
		.where(
			and(
				eq(oauthProviderCredentials.id, credentialId),
				eq(oauthProviderCredentials.userId, userId),
				eq(
					oauthProviderCredentials.type,
					type as
						| "google_drive"
						| "s3"
						| "local"
						| "dropbox"
						| "ftp"
						| "webdav"
						| "telegram",
				),
			),
		)
		.limit(1);

	if (!credential) {
		throw new NotFoundError("OAuth credential");
	}

	const sensitiveFields = getSensitiveFields(type);
	return decryptConfig(credential.encryptedConfig, sensitiveFields);
}
