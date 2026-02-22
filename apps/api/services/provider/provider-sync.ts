import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, folders, storageProviders } from "@drivebase/db";
import { and, eq, notInArray } from "drizzle-orm";
import { pubSub } from "../../graphql/pubsub";
import { telemetry } from "../../posthog";
import { getProviderInstance } from "./provider-queries";

/**
 * Sync provider quota and files
 */
export async function syncProvider(
	db: Database,
	providerId: string,
	workspaceId: string,
	userId: string,
	options?: { recursive?: boolean; pruneDeleted?: boolean },
) {
	const { recursive = true, pruneDeleted = false } = options || {};

	const [providerRecord] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, providerId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!providerRecord) {
		throw new NotFoundError("Provider");
	}

	const syncStartTime = Date.now();

	// Notify start
	pubSub.publish("providerSyncProgress", providerId, {
		providerId,
		processed: 0,
		status: "running",
		message: "Starting sync...",
	});

	const provider = await getProviderInstance(providerRecord);

	const seenFileRemoteIds: string[] = [];
	let processedCount = 0;

	// Helper to sync a folder recursively
	const syncFolder = async (
		remoteFolderId: string | undefined,
		parentDbId: string | null,
		parentPath: string,
	) => {
		let pageToken: string | undefined;

		do {
			const listResult = await provider.list({
				folderId: remoteFolderId,
				pageToken,
				limit: 100,
			});

			// Process Folders - folders are DB-only, matched by virtualPath
			for (const folder of listResult.folders) {
				const cleanName = folder.name.replace(/\//g, "-");
				const virtualPath = `${parentPath}${cleanName}/`;

				// Check if folder exists by virtualPath
				let [dbFolder] = await db
					.select()
					.from(folders)
					.where(
						and(
							eq(folders.virtualPath, virtualPath),
							eq(folders.workspaceId, workspaceId),
						),
					)
					.limit(1);

				if (!dbFolder) {
					try {
						[dbFolder] = await db
							.insert(folders)
							.values({
								name: cleanName,
								virtualPath,
								workspaceId,
								parentId: parentDbId,
								createdBy: userId,
								updatedAt: folder.modifiedAt,
								createdAt: folder.modifiedAt,
							})
							.returning();
					} catch (error) {
						console.warn(`Failed to insert folder ${virtualPath}: ${error}`);
						continue;
					}
				} else {
					try {
						[dbFolder] = await db
							.update(folders)
							.set({
								name: cleanName,
								parentId: parentDbId,
								updatedAt: folder.modifiedAt,
								isDeleted: false,
							})
							.where(eq(folders.id, dbFolder.id))
							.returning();
					} catch (error) {
						console.warn(`Failed to update folder ${virtualPath}: ${error}`);
					}
				}

				processedCount++;
				if (processedCount % 10 === 0) {
					pubSub.publish("providerSyncProgress", providerId, {
						providerId,
						processed: processedCount,
						status: "running",
						message: `Syncing... (${processedCount} items)`,
					});
				}

				if (recursive && dbFolder) {
					await syncFolder(folder.remoteId, dbFolder.id, virtualPath);
				}
			}

			// Process Files
			for (const file of listResult.files) {
				const cleanName = file.name.replace(/\//g, "-");
				const virtualPath = `${parentPath}${cleanName}`;

				seenFileRemoteIds.push(file.remoteId);

				try {
					const [existingFile] = await db
						.select()
						.from(files)
						.where(
							and(
								eq(files.remoteId, file.remoteId),
								eq(files.providerId, providerId),
							),
						)
						.limit(1);

					if (existingFile) {
						await db
							.update(files)
							.set({
								name: cleanName,
								virtualPath,
								mimeType: file.mimeType,
								size: file.size,
								hash: file.hash,
								folderId: parentDbId,
								updatedAt: file.modifiedAt,
								isDeleted: false,
							})
							.where(eq(files.id, existingFile.id));
					} else {
						await db.insert(files).values({
							name: cleanName,
							virtualPath,
							mimeType: file.mimeType,
							size: file.size,
							hash: file.hash,
							remoteId: file.remoteId,
							providerId,
							folderId: parentDbId,
							uploadedBy: userId,
							updatedAt: file.modifiedAt,
							createdAt: file.modifiedAt,
						});
					}
				} catch (error) {
					console.warn(`Failed to sync file ${virtualPath}: ${error}`);
				}

				processedCount++;
				if (processedCount % 10 === 0) {
					pubSub.publish("providerSyncProgress", providerId, {
						providerId,
						processed: processedCount,
						status: "running",
						message: `Syncing... (${processedCount} items)`,
					});
				}
			}

			pageToken = listResult.nextPageToken;
		} while (pageToken);
	};

	try {
		await syncFolder(providerRecord.rootFolderId || undefined, null, "/");

		// Prune deleted files if requested (only files are tied to providers)
		if (pruneDeleted && seenFileRemoteIds.length > 0) {
			pubSub.publish("providerSyncProgress", providerId, {
				providerId,
				processed: processedCount,
				status: "running",
				message: "Pruning deleted items...",
			});

			await db
				.update(files)
				.set({ isDeleted: true })
				.where(
					and(
						eq(files.providerId, providerId),
						notInArray(files.remoteId, seenFileRemoteIds),
					),
				);
		}

		const quota = await provider.getQuota();

		const [updated] = await db
			.update(storageProviders)
			.set({
				quotaTotal: quota.total ?? null,
				quotaUsed: quota.used,
				lastSyncAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(storageProviders.id, providerId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update provider");
		}

		pubSub.publish("providerSyncProgress", providerId, {
			providerId,
			processed: processedCount,
			status: "completed",
			message: "Sync completed successfully",
		});

		telemetry.capture("provider_sync_completed", {
			type: providerRecord.type,
			duration_ms: Date.now() - syncStartTime,
		});

		await provider.cleanup();

		return updated;
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		pubSub.publish("providerSyncProgress", providerId, {
			providerId,
			processed: processedCount,
			status: "error",
			message: `Sync failed: ${msg}`,
		});
		throw error;
	}
}
