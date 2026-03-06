import { ConflictError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import {
	users,
	storageProviders,
	webdavCredentials,
	workspaceMemberships,
	workspaces,
} from "@drivebase/db";
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
	const providerIds = providerScopes.map((scope) => scope.providerId);

	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.id, input.userId))
		.limit(1);
	if (!user) {
		throw new ValidationError("Selected user was not found");
	}

	const [membership] = await db
		.select({ userId: workspaces.ownerId })
		.from(workspaces)
		.where(
			and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, input.userId)),
		)
		.limit(1);

	if (!membership) {
		const [workspaceMembership] = await db
			.select({ userId: workspaceMemberships.userId })
			.from(workspaceMemberships)
			.where(
				and(
					eq(workspaceMemberships.workspaceId, workspaceId),
					eq(workspaceMemberships.userId, input.userId),
				),
			)
			.limit(1);

		if (!workspaceMembership) {
			throw new ValidationError(
				"Selected user must belong to the active workspace",
			);
		}
	}

	const [existing] = await db
		.select({ id: webdavCredentials.id })
		.from(webdavCredentials)
		.where(eq(webdavCredentials.username, username))
		.limit(1);
	if (existing) {
		throw new ConflictError("WebDAV username is already in use");
	}

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

	const password = generateWebDavPassword();
	const passwordHash = await hashPassword(password);

	const [credential] = await db
		.insert(webdavCredentials)
		.values({
			workspaceId,
			userId: input.userId,
			name: input.name.trim(),
			username,
			passwordHash,
			providerScopes,
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
