import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, folders, storageProviders } from "@drivebase/db";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { ActivityService } from "../activity";
import { telemetry } from "../../telemetry";
import { getProviderInstance } from "./provider-queries";

function getSyncProgress(processedCount: number): number {
	if (processedCount <= 0) return 0;
	return Math.min(0.95, processedCount / (processedCount + 20));
}

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
	const activityService = new ActivityService(db);
	const job = await activityService.create(workspaceId, {
		type: "sync",
		title: `Syncing ${providerRecord.name}`,
		message: "Starting sync...",
		metadata: {
			providerId,
			recursive,
			pruneDeleted,
		},
	});

	await activityService.update(job.id, {
		status: "running",
		message: "Starting sync...",
		progress: 0,
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

			// Process Folders - matched by (remoteId, providerId)
			for (const folder of listResult.folders) {
				const cleanName = folder.name.replace(/\//g, "-");
				const virtualPath = `${parentPath}${cleanName}/`;

				// Check if folder exists by remoteId + providerId
				let [dbFolder] = await db
					.select()
					.from(folders)
					.where(
						and(
							eq(folders.remoteId, folder.remoteId),
							eq(folders.providerId, providerId),
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
								remoteId: folder.remoteId,
								providerId,
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
								virtualPath,
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
					await activityService.update(job.id, {
						status: "running",
						progress: getSyncProgress(processedCount),
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
						await db
							.insert(files)
							.values({
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
							})
							.onConflictDoUpdate({
								target: [files.virtualPath, files.providerId],
								set: {
									name: cleanName,
									mimeType: file.mimeType,
									size: file.size,
									hash: file.hash,
									remoteId: file.remoteId,
									folderId: parentDbId,
									updatedAt: file.modifiedAt,
									isDeleted: false,
								},
							});
					}
				} catch (error) {
					console.warn(`Failed to sync file ${virtualPath}: ${error}`);
				}

				processedCount++;
				if (processedCount % 10 === 0) {
					await activityService.update(job.id, {
						status: "running",
						progress: getSyncProgress(processedCount),
						message: `Syncing... (${processedCount} items)`,
					});
				}
			}

			pageToken = listResult.nextPageToken;
		} while (pageToken);
	};

	try {
		await syncFolder(undefined, null, "/");

		// Prune deleted files if requested (only files are tied to providers)
		if (pruneDeleted && seenFileRemoteIds.length > 0) {
			await activityService.update(job.id, {
				status: "running",
				progress: getSyncProgress(processedCount),
				message: "Pruning deleted items...",
			});

			await db
				.delete(files)
				.where(
					and(
						eq(files.providerId, providerId),
						isNull(files.vaultId),
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

		await activityService.complete(
			job.id,
			`Sync completed successfully (${processedCount} items)`,
		);

		telemetry.capture("provider_sync_completed", {
			type: providerRecord.type,
			duration_ms: Date.now() - syncStartTime,
		});

		return updated;
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		await activityService.fail(job.id, `Sync failed: ${msg}`);
		throw error;
	} finally {
		await provider.cleanup();
	}
}
