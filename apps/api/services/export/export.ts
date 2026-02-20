import type { Database } from "@drivebase/db";
import { files, folders, storageProviders, workspaces } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { getSensitiveFields } from "../../config/providers";
import { decryptConfig } from "../../utils/encryption";

interface ExportOptions {
	includeProviders: boolean;
	includeSecrets: boolean;
}

interface ExportPayload {
	version: number;
	exportedAt: string;
	workspace: {
		id: string;
		name: string;
		color: string;
	};
	folders: Array<{
		id: string;
		virtualPath: string;
		name: string;
		parentId: string | null;
		starred: boolean;
		createdAt: string;
	}>;
	files: Array<{
		id: string;
		virtualPath: string;
		name: string;
		mimeType: string;
		size: number;
		hash: string | null;
		remoteId: string;
		providerId: string;
		folderId: string | null;
		starred: boolean;
		createdAt: string;
	}>;
	providers?: Array<{
		id: string;
		name: string;
		type: string;
		authType: string;
		accountEmail: string | null;
		accountName: string | null;
		config?: Record<string, unknown>;
	}>;
}

export async function buildExportPayload(
	db: Database,
	workspaceId: string,
	options: ExportOptions,
): Promise<ExportPayload> {
	const workspace = await db
		.select({
			id: workspaces.id,
			name: workspaces.name,
			color: workspaces.color,
		})
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.then((rows) => rows[0]);

	if (!workspace) {
		throw new Error("Workspace not found");
	}

	// Get providers for this workspace
	const providerRows = await db
		.select()
		.from(storageProviders)
		.where(eq(storageProviders.workspaceId, workspaceId));

	// Query non-deleted folders belonging to this workspace
	const folderRows = await db
		.select({
			id: folders.id,
			virtualPath: folders.virtualPath,
			name: folders.name,
			parentId: folders.parentId,
			starred: folders.starred,
			createdAt: folders.createdAt,
		})
		.from(folders)
		.where(
			and(eq(folders.workspaceId, workspaceId), eq(folders.isDeleted, false)),
		);

	// Query non-deleted files belonging to workspace providers
	const providerIds = providerRows.map((p) => p.id);
	const fileRows =
		providerIds.length > 0
			? await db
					.select({
						id: files.id,
						virtualPath: files.virtualPath,
						name: files.name,
						mimeType: files.mimeType,
						size: files.size,
						hash: files.hash,
						remoteId: files.remoteId,
						providerId: files.providerId,
						folderId: files.folderId,
						starred: files.starred,
						createdAt: files.createdAt,
					})
					.from(files)
					.innerJoin(
						storageProviders,
						eq(files.providerId, storageProviders.id),
					)
					.where(
						and(
							eq(storageProviders.workspaceId, workspaceId),
							eq(files.isDeleted, false),
						),
					)
			: [];

	const payload: ExportPayload = {
		version: 1,
		exportedAt: new Date().toISOString(),
		workspace,
		folders: folderRows.map((f) => ({
			...f,
			createdAt: f.createdAt.toISOString(),
		})),
		files: fileRows.map((f) => ({
			...f,
			createdAt: f.createdAt.toISOString(),
		})),
	};

	if (options.includeProviders) {
		payload.providers = providerRows.map((p) => {
			const provider: NonNullable<ExportPayload["providers"]>[number] = {
				id: p.id,
				name: p.name,
				type: p.type,
				authType: p.authType,
				accountEmail: p.accountEmail,
				accountName: p.accountName,
			};

			if (options.includeSecrets) {
				const sensitive = getSensitiveFields(p.type);
				provider.config = decryptConfig(p.encryptedConfig, sensitive);
			}

			return provider;
		});
	}

	return payload;
}
