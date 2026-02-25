import { ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { oauthProviderCredentials } from "@drivebase/db";
import { and, desc, eq } from "drizzle-orm";
import { getProviderRegistration } from "@/config/providers";

// List saved OAuth credentials for a provider type.
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
