import { ConflictError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders, webdavCredentials } from "@drivebase/db";
import { and, eq, inArray } from "drizzle-orm";
import { hashPassword } from "@/utils/auth/password";
import { listWebDavCredentials } from "../query";
import { generateWebDavPassword } from "../shared/password";
import {
	normalizeWebDavProviderScopes,
	normalizeWebDavUsername,
} from "../shared/scope";
import type { CreateWebDavCredentialInput } from "../shared/types";

export async function createWebDavCredential(
	db: Database,
	workspaceId: string,
	input: CreateWebDavCredentialInput,
) {
	if (!input.name.trim()) {
		throw new ValidationError("Credential name is required");
	}

	const username = normalizeWebDavUsername(input.username);
	const providerScopes = normalizeWebDavProviderScopes(input.providerScopes);
	const providerIds = providerScopes?.map((scope) => scope.providerId) ?? [];

	const [existing] = await db
		.select({ id: webdavCredentials.id })
		.from(webdavCredentials)
		.where(eq(webdavCredentials.username, username))
		.limit(1);
	if (existing) {
		throw new ConflictError("WebDAV username is already in use");
	}

	if (providerIds.length > 0) {
		const providers = await db
			.select({ id: storageProviders.id })
			.from(storageProviders)
			.where(
				and(
					eq(storageProviders.workspaceId, workspaceId),
					eq(storageProviders.isActive, true),
					inArray(storageProviders.id, providerIds),
				),
			);

		if (providers.length !== providerIds.length) {
			throw new ValidationError(
				"All provider scopes must reference active providers in this workspace",
			);
		}
	}

	const password = generateWebDavPassword();
	const passwordHash = await hashPassword(password);

	const [credential] = await db
		.insert(webdavCredentials)
		.values({
			workspaceId,
			name: input.name.trim(),
			username,
			passwordHash,
			providerScopes: providerScopes ?? null,
		})
		.returning();

	if (!credential) {
		throw new Error("Failed to create WebDAV credential");
	}

	const created = await listWebDavCredentials(db, workspaceId).then((rows) =>
		rows.find((row) => row.id === credential.id),
	);
	if (!created) {
		throw new Error("Failed to load created WebDAV credential");
	}

	return {
		credential: created,
		password,
	};
}
