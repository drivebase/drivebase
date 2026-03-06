import { AuthenticationError, AuthorizationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { webdavCredentials } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/utils/auth/password";
import { getWorkspaceAccessRole } from "../workspace";
import { getWebDavCredentialByUsername } from "./query";
import { normalizeWebDavProviderScopes } from "./shared/scope";
import type { WebDavAuthResult } from "./shared/types";

export async function authenticateWebDavCredential(
	db: Database,
	username: string,
	password: string,
): Promise<WebDavAuthResult> {
	const record = await getWebDavCredentialByUsername(
		db,
		username.trim().toLowerCase(),
	);
	if (!record || !record.isActive || !record.userIsActive) {
		throw new AuthenticationError("Invalid WebDAV credentials");
	}

	const isValid = await verifyPassword(password, record.passwordHash);
	if (!isValid) {
		throw new AuthenticationError("Invalid WebDAV credentials");
	}

	const workspaceRole = await getWorkspaceAccessRole(
		db,
		record.workspaceId,
		record.userId,
	);
	if (!workspaceRole) {
		throw new AuthorizationError("User no longer has access to this workspace");
	}

	db.update(webdavCredentials)
		.set({ lastUsedAt: new Date(), updatedAt: new Date() })
		.where(eq(webdavCredentials.id, record.credentialId))
		.catch(() => undefined);

	return {
		credentialId: record.credentialId,
		workspaceId: record.workspaceId,
		userId: record.userId,
		email: record.email,
		name: record.name,
		role: workspaceRole,
		username: record.username,
		providerScopes: normalizeWebDavProviderScopes(
			record.providerScopes ?? null,
		),
	};
}
