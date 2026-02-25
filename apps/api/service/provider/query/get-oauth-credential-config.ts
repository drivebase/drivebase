import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { oauthProviderCredentials } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { getSensitiveFields } from "@/config/providers";
import { decryptConfig } from "@/utils/encryption";

// Resolve stored OAuth credential config for provider connection.
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

	if (!credential) throw new NotFoundError("OAuth credential");
	const sensitiveFields = getSensitiveFields(type);
	return decryptConfig(credential.encryptedConfig, sensitiveFields);
}
