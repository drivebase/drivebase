import { joinPath } from "@drivebase/core";
import { type Folder, files, folders, getDb, jobs } from "@drivebase/db";
import { and, eq, inArray, like } from "drizzle-orm";
import { enqueueProviderTransfer } from "@/queue/transfer/enqueue";
import type {
	ProviderFileTransferJobData,
	ProviderFolderTransferJobData,
} from "@/queue/transfer/queue";
import { moveFolder } from "@/service/folder/mutation";
import type { ProviderService } from "@/service/provider";
import { logger } from "@/utils/runtime/logger";
import { getTargetFolder } from "./conflict";
import { markFolderSubtreeDeleted } from "./db-ops";
import type { JobContext } from "./types";
import { sleep } from "./utils";

export async function handleFolderTransfer(
	ctx: JobContext,
	data: ProviderFolderTransferJobData,
) {
	const db = getDb();
	const {
		activityService,
		providerService,
		jobId,
		workspaceId,
		userId,
		assertNotCancelled,
		updateActivity,
	} = ctx;

	let sourceProvider: Awaited<
		ReturnType<ProviderService["getProviderInstance"]>
	> | null = null;
	let targetProvider: Awaited<
		ReturnType<ProviderService["getProviderInstance"]>
	> | null = null;

	try {
		await updateActivity({
			status: "running",
			progress: 0,
			message: "Preparing folder transfer",
			metadata: {
				phase: "prepare",
				entity: "folder",
				operation: data.operation,
			},
		});

		const [sourceFolder] = await db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.id, data.folderId),
					eq(folders.nodeType, "folder"),
					eq(folders.workspaceId, workspaceId),
					eq(folders.isDeleted, false),
				),
			)
			.limit(1);

		if (!sourceFolder) {
			await activityService.fail(jobId, "Folder not found");
			return;
		}
		logger.debug({
			msg: "[transfer:folder] starting",
			jobId,
			folderId: sourceFolder.id,
			sourceProviderId: sourceFolder.providerId,
			sourcePath: sourceFolder.virtualPath,
			targetFolderId: data.targetFolderId ?? null,
			operation: data.operation,
			parentJobId: data.parentJobId ?? null,
		});

		const targetFolder = await getTargetFolder(
			workspaceId,
			data.targetFolderId ?? null,
		);
		if (
			targetFolder &&
			(targetFolder.id === sourceFolder.id ||
				targetFolder.virtualPath.startsWith(`${sourceFolder.virtualPath}/`))
		) {
			await activityService.fail(
				jobId,
				"Cannot paste a folder into itself or a descendant folder",
			);
			return;
		}

		const targetProviderId = targetFolder
			? targetFolder.providerId
			: sourceFolder.providerId;
		const destinationPath = joinPath(
			targetFolder?.virtualPath ?? "/",
			sourceFolder.name,
		);
		logger.debug({
			msg: "[transfer:folder] resolved destination",
			jobId,
			folderId: sourceFolder.id,
			sourceProviderId: sourceFolder.providerId,
			targetProviderId,
			destinationPath,
			targetFolderId: targetFolder?.id ?? null,
			operation: data.operation,
		});

		// Fast path: move same-provider folders synchronously for cut.
		if (
			data.operation === "cut" &&
			targetProviderId === sourceFolder.providerId
		) {
			logger.debug({
				msg: "[transfer:folder] using same-provider move",
				jobId,
				folderId: sourceFolder.id,
				targetFolderId: targetFolder?.id ?? null,
			});
			await moveFolder(
				db,
				sourceFolder.id,
				userId,
				workspaceId,
				targetFolder?.id ?? undefined,
			);
			await activityService.complete(jobId, "Transfer completed");
			return;
		}

		const sourceRecord = await providerService.getProvider(
			sourceFolder.providerId,
			userId,
			workspaceId,
		);
		const targetRecord = await providerService.getProvider(
			targetProviderId,
			userId,
			workspaceId,
		);
		sourceProvider = await providerService.getProviderInstance(sourceRecord);
		targetProvider = await providerService.getProviderInstance(targetRecord);

		const folderPrefix = `${sourceFolder.virtualPath}/`;
		const sourceSubfolders = await db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.workspaceId, workspaceId),
					eq(folders.providerId, sourceFolder.providerId),
					eq(folders.nodeType, "folder"),
					eq(folders.isDeleted, false),
					like(folders.virtualPath, `${sourceFolder.virtualPath}/%`),
				),
			)
			.orderBy(folders.virtualPath);
		sourceSubfolders.unshift(sourceFolder);

		const sourceSubfiles = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.workspaceId, workspaceId),
					eq(files.providerId, sourceFolder.providerId),
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					like(files.virtualPath, `${folderPrefix}%`),
				),
			)
			.orderBy(files.virtualPath);
		logger.debug({
			msg: "[transfer:folder] loaded subtree",
			jobId,
			folderId: sourceFolder.id,
			subfolderCount: sourceSubfolders.length,
			subfileCount: sourceSubfiles.length,
		});

		const sourceFolderById = new Map(
			sourceSubfolders.map((folder) => [folder.id, folder]),
		);
		const destinationBySourceId = new Map<string, Folder>();

		// Reuse existing destination folder if it was created by a previous
		// (failed) attempt, so retries don't hit a ConflictError.
		const [existingRoot] = await db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.nodeType, "folder"),
					eq(folders.providerId, targetProviderId),
					eq(folders.virtualPath, destinationPath),
					eq(folders.workspaceId, workspaceId),
					eq(folders.isDeleted, false),
				),
			)
			.limit(1);

		let rootFolder: Folder;
		if (existingRoot) {
			logger.debug({
				msg: "[transfer:folder] reusing existing destination root",
				jobId,
				existingFolderId: existingRoot.id,
				destinationPath,
			});
			rootFolder = existingRoot;
		} else {
			const rootRemoteId = await targetProvider.createFolder({
				name: sourceFolder.name,
				parentId: targetFolder?.remoteId,
			});
			const [newRoot] = await db
				.insert(folders)
				.values({
					nodeType: "folder",
					virtualPath: destinationPath,
					name: sourceFolder.name,
					remoteId: rootRemoteId,
					providerId: targetProviderId,
					workspaceId,
					parentId: targetFolder?.id ?? null,
					createdBy: userId,
					isDeleted: false,
				})
				.returning();
			if (!newRoot) {
				throw new Error("Failed to create destination folder");
			}
			rootFolder = newRoot;
		}
		destinationBySourceId.set(sourceFolder.id, rootFolder);

		const descendants = sourceSubfolders
			.filter((folder) => folder.id !== sourceFolder.id)
			.sort((a, b) => a.virtualPath.length - b.virtualPath.length);
		for (const sourceDescendant of descendants) {
			await assertNotCancelled();
			const sourceParent = sourceDescendant.parentId
				? sourceFolderById.get(sourceDescendant.parentId)
				: undefined;
			const destinationParent =
				(sourceParent && destinationBySourceId.get(sourceParent.id)) ??
				rootFolder;
			const destinationVirtualPath = joinPath(
				destinationParent.virtualPath,
				sourceDescendant.name,
			);

			// Reuse existing descendant folder from a previous attempt.
			const [existingDescendant] = await db
				.select()
				.from(folders)
				.where(
					and(
						eq(folders.nodeType, "folder"),
						eq(folders.providerId, targetProviderId),
						eq(folders.virtualPath, destinationVirtualPath),
						eq(folders.workspaceId, workspaceId),
						eq(folders.isDeleted, false),
					),
				)
				.limit(1);

			if (existingDescendant) {
				destinationBySourceId.set(sourceDescendant.id, existingDescendant);
				continue;
			}

			const remoteId = await targetProvider.createFolder({
				name: sourceDescendant.name,
				parentId: destinationParent.remoteId,
			});
			const [inserted] = await db
				.insert(folders)
				.values({
					nodeType: "folder",
					virtualPath: destinationVirtualPath,
					name: sourceDescendant.name,
					remoteId,
					providerId: targetProviderId,
					workspaceId,
					parentId: destinationParent.id,
					createdBy: userId,
					isDeleted: false,
				})
				.returning();
			if (!inserted) {
				throw new Error("Failed to create destination descendant folder");
			}
			destinationBySourceId.set(sourceDescendant.id, inserted);
		}

		await updateActivity({
			progress: 0.25,
			message: "Queued nested file transfers",
			metadata: {
				phase: "queue_children",
				entity: "folder",
				operation: data.operation,
				totalFiles: sourceSubfiles.length,
			},
		});

		const childJobIds: string[] = [];
		const childFileOperation: ProviderFileTransferJobData["operation"] =
			data.operation === "cut" ? "cut" : "copy";
		for (const sourceFile of sourceSubfiles) {
			await assertNotCancelled();
			const sourceParentFolder = sourceFile.folderId
				? destinationBySourceId.get(sourceFile.folderId)
				: rootFolder;
			const destinationFolderId = sourceParentFolder?.id ?? rootFolder.id;
			const enqueued = await enqueueProviderTransfer(activityService, {
				entity: "file",
				operation: childFileOperation,
				workspaceId,
				userId,
				parentJobId: jobId,
				fileId: sourceFile.id,
				targetProviderId,
				targetFolderId: destinationFolderId,
				title: `Transfer ${sourceFile.name}`,
				message: "Queued from folder transfer",
				metadata: {
					fileId: sourceFile.id,
					fileName: sourceFile.name,
					sourceProviderId: sourceFolder.providerId,
					targetProviderId,
					targetFolderId: destinationFolderId,
					parentJobId: jobId,
				},
			});
			childJobIds.push(enqueued.activityJob.id);
			logger.debug({
				msg: "[transfer:folder] child file job queued",
				jobId,
				folderId: sourceFolder.id,
				childJobId: enqueued.activityJob.id,
				fileId: sourceFile.id,
				filePath: sourceFile.virtualPath,
				targetFolderId: destinationFolderId,
				operation: childFileOperation,
			});
		}

		await updateActivity({
			progress: sourceSubfiles.length === 0 ? 0.9 : 0.4,
			message:
				sourceSubfiles.length === 0
					? "No files in folder, finalizing"
					: "Waiting for nested file transfers",
			metadata: {
				phase: "children_running",
				entity: "folder",
				operation: data.operation,
				childJobIds,
				totalFiles: sourceSubfiles.length,
			},
		});

		if (childJobIds.length > 0) {
			while (true) {
				await assertNotCancelled();
				const childRows = await db
					.select({ id: jobs.id, status: jobs.status })
					.from(jobs)
					.where(inArray(jobs.id, childJobIds));
				if (childRows.length < childJobIds.length) {
					await sleep(1000);
					continue;
				}
				const hasActive = childRows.some(
					(row) => row.status === "pending" || row.status === "running",
				);
				if (hasActive) {
					await sleep(1000);
					continue;
				}
				const hasFailure = childRows.some((row) => row.status === "error");
				if (hasFailure) {
					logger.error({
						msg: "[transfer:folder] child file transfers failed",
						jobId,
						folderId: sourceFolder.id,
						childJobIds,
					});
					await activityService.fail(
						jobId,
						"One or more nested file transfers failed",
					);
					return;
				}
				break;
			}
		}
		logger.debug({
			msg: "[transfer:folder] all child file jobs completed",
			jobId,
			folderId: sourceFolder.id,
			childCount: childJobIds.length,
			operation: data.operation,
		});

		if (data.operation === "cut") {
			logger.debug({
				msg: "[transfer:folder] finalizing cut",
				jobId,
				folderId: sourceFolder.id,
				sourceRemoteId: sourceFolder.remoteId,
				sourcePath: sourceFolder.virtualPath,
			});

			await markFolderSubtreeDeleted(
				workspaceId,
				sourceFolder.providerId,
				sourceFolder.virtualPath,
			);

			try {
				await sourceProvider.delete({
					remoteId: sourceFolder.remoteId,
					isFolder: true,
				});
			} catch (deleteError) {
				logger.warn({
					msg: "[transfer:folder] source folder deletion failed after DB update; remote orphan remains",
					jobId,
					folderId: sourceFolder.id,
					sourceRemoteId: sourceFolder.remoteId,
					sourcePath: sourceFolder.virtualPath,
					error:
						deleteError instanceof Error
							? deleteError.message
							: String(deleteError),
				});
			}

			logger.debug({
				msg: "[transfer:folder] source subtree marked deleted",
				jobId,
				folderId: sourceFolder.id,
				sourcePath: sourceFolder.virtualPath,
			});
		}

		await activityService.complete(jobId, "Transfer completed");
	} finally {
		if (sourceProvider) {
			await sourceProvider.cleanup().catch(() => {});
		}
		if (targetProvider) {
			await targetProvider.cleanup().catch(() => {});
		}
	}
}
