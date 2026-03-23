import { mkdir, open, rm } from "node:fs/promises";
import { join } from "node:path";
import { DrivebaseError, joinPath } from "@drivebase/core";
import { type Folder, files, folders, getDb } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { ProviderRootTransferJobData } from "@/queue/transfer/queue";
import { getFile } from "@/service/file/query/file-read";
import type { ProviderService } from "@/service/provider";
import {
	type TransferConflictAction,
	type TransferFileEntry,
	type TransferManifest,
	type TransferRootEntry,
	getTransferSessionById,
	updateTransferSession,
} from "@/service/file/transfer/transfer-session";
import { waitForJobResolution } from "@/utils/jobs/job-pause";
import { logger } from "@/utils/runtime/logger";
import {
	checkFileConflict,
	checkFolderConflict,
	getTargetFolder,
	getUniqueFilename,
	getUniqueFolderName,
} from "./conflict";
import { markFolderSubtreeDeleted } from "./db-ops";
import { buildTransferManifest } from "./manifest";
import { getProviderLimiter } from "./provider-limiter";
import { Semaphore } from "./semaphore";
import {
	DEFAULT_TRANSFER_CHUNK_SIZE,
	FILE_CONCURRENCY,
	type JobContext,
	PERSIST_BATCH_SIZE,
	PERSIST_INTERVAL_MS,
} from "./types";
import {
	getTransferCacheRoot,
	getTransferCompletionMessage,
	getTransferProgress,
	syncManifestCounts,
} from "./utils";

export async function handleRootTransfer(
	ctx: JobContext,
	data: ProviderRootTransferJobData,
) {
	const db = getDb();
	const {
		activityService,
		providerService,
		jobId,
		workspaceId,
		userId,
		assertNotCancelled,
	} = ctx;

	const session = await getTransferSessionById(db, data.transferSessionId);
	if (!session) {
		await activityService.fail(jobId, "Transfer session not found");
		return;
	}

	let manifest = session.manifestData;
	let targetProvider: Awaited<
		ReturnType<ProviderService["getProviderInstance"]>
	> | null = null;
	const sourceProviders = new Map<
		string,
		Awaited<ReturnType<ProviderService["getProviderInstance"]>>
	>();

	const persistManifest = async (
		nextManifest: TransferManifest,
		status: typeof session.status,
	) => {
		manifest = syncManifestCounts(nextManifest);
		await updateTransferSession(db, session.id, {
			status,
			manifest,
		});
		return manifest;
	};

	const updateTransferJob = async (input: {
		status?: import("@drivebase/db").Job["status"];
		message: string;
		progress: number;
		metadata?: Record<string, unknown>;
	}) => {
		await assertNotCancelled();
		await activityService.update(jobId, {
			...input,
			metadata: {
				entity: "transfer",
				operation: data.operation,
				totalFiles: manifest?.totalFiles ?? 0,
				completedFiles: manifest?.completedFiles ?? 0,
				failedFiles: manifest?.failedFiles ?? 0,
				skippedFiles: manifest?.skippedFiles ?? 0,
				...(manifest?.hiddenFiles ? { hiddenFiles: manifest.hiddenFiles } : {}),
				...(input.metadata ?? {}),
			},
		});
	};

	const requireManifest = (): TransferManifest => {
		if (!manifest) {
			throw new Error("Transfer manifest not initialized");
		}
		return manifest;
	};

	const getSourceProvider = async (providerId: string) => {
		let provider = sourceProviders.get(providerId);
		if (!provider) {
			const record = await providerService.getProvider(
				providerId,
				userId,
				workspaceId,
			);
			provider = await providerService.getProviderInstance(record);
			sourceProviders.set(providerId, provider);
		}
		return provider;
	};

	const getRootById = (rootId: string | null) => {
		if (!rootId) return null;
		return requireManifest().roots.find((root) => root.id === rootId) ?? null;
	};

	const markRootSkipped = (rootId: string) => {
		const transferManifest = requireManifest();
		for (const root of transferManifest.roots) {
			if (root.id === rootId) {
				root.status = "skipped";
			}
		}
		for (const folder of transferManifest.folders) {
			if (folder.sourceRootId === rootId) {
				folder.status = "skipped";
			}
		}
		for (const file of transferManifest.files) {
			if (file.sourceRootId === rootId && file.status === "pending") {
				file.status = "skipped";
			}
		}
	};

	const waitForConflictResolution = async (
		conflict: TransferManifest["currentConflict"],
		message: string,
	) => {
		if (!conflict) {
			throw new Error("Missing transfer manifest conflict state");
		}
		const transferManifest = requireManifest();

		transferManifest.currentConflict = conflict;
		await persistManifest(transferManifest, "paused");
		await updateTransferJob({
			status: "paused",
			message,
			progress:
				transferManifest.totalFiles === 0
					? 0
					: (transferManifest.completedFiles +
							transferManifest.failedFiles +
							transferManifest.skippedFiles) /
						transferManifest.totalFiles,
			metadata: {
				phase: "conflict",
				conflictKind: conflict.kind,
				currentPath: conflict.currentPath,
				allowedResolutions: conflict.allowedResolutions,
				allowApplyToAll: conflict.kind === "file",
			},
		});

		const resolution = await waitForJobResolution<{
			action: TransferConflictAction;
			applyToAll?: boolean;
		}>(jobId);

		if (!conflict.allowedResolutions.includes(resolution.action)) {
			throw new Error(`Unsupported conflict resolution: ${resolution.action}`);
		}

		if (conflict.kind === "file" && resolution.applyToAll) {
			transferManifest.applyToAllFileResolution = resolution.action;
		}
		transferManifest.currentConflict = null;
		await persistManifest(transferManifest, "running");

		return resolution;
	};

	const buildFileProgress = (
		_fileEntry: TransferFileEntry,
		fileProgress = 0,
	): number => {
		const transferManifest = manifest;
		if (!transferManifest || transferManifest.totalFiles === 0) {
			return 0.95;
		}
		const processed =
			transferManifest.completedFiles +
			transferManifest.failedFiles +
			transferManifest.skippedFiles;
		return Math.min(
			(processed + fileProgress) / transferManifest.totalFiles,
			0.99,
		);
	};

	const getCurrentFilePosition = (): {
		current: number;
		total: number;
	} => {
		const transferManifest = requireManifest();
		const total = Math.max(transferManifest.totalFiles, 1);
		const processed =
			transferManifest.completedFiles +
			transferManifest.failedFiles +
			transferManifest.skippedFiles;

		return {
			current: Math.min(processed + 1, total),
			total,
		};
	};

	const buildFileTransferMessage = (verb: string, fileName: string): string => {
		const { current, total } = getCurrentFilePosition();
		return `${verb} ${current} of ${total} files — ${fileName}`;
	};

	const reportFileProgress = async (
		fileEntry: TransferFileEntry,
		fileProgress: number,
		message: string,
	) => {
		await updateTransferJob({
			status: "running",
			message,
			progress: buildFileProgress(fileEntry, fileProgress),
			metadata: {
				phase: "transfer",
				currentPath: fileEntry.sourceVirtualPath,
			},
		});
	};

	try {
		if (!manifest) {
			await updateTransferJob({
				status: "running",
				message: "Scanning source",
				progress: 0.01,
				metadata: { phase: "scan" },
			});
			manifest = await buildTransferManifest(
				userId,
				workspaceId,
				session.sourceItemsData,
				session.targetFolderId ?? null,
				session.targetProviderId ?? "",
			);
			await persistManifest(manifest, "scanning");
		}

		const transferManifest = requireManifest();
		const targetFolder = await getTargetFolder(
			workspaceId,
			transferManifest.targetFolderId ?? null,
		);
		const targetProviderId =
			transferManifest.targetProviderId || targetFolder?.providerId;
		if (!targetProviderId) {
			throw new Error("Target provider not resolved for transfer");
		}
		transferManifest.targetProviderId = targetProviderId;

		if (targetFolder && targetFolder.providerId !== targetProviderId) {
			throw new Error("Target folder does not belong to target provider");
		}

		const targetRecord = await providerService.getProvider(
			targetProviderId,
			userId,
			workspaceId,
		);
		targetProvider = await providerService.getProviderInstance(targetRecord);
		const resolvedTargetProvider = targetProvider;

		if (!transferManifest.preflightComplete) {
			for (const root of transferManifest.roots) {
				if (root.status === "skipped") continue;

				const destinationPath = joinPath(
					targetFolder?.virtualPath ?? "/",
					root.resolvedName,
				);
				const existing = await checkFolderConflict(
					destinationPath,
					targetProviderId,
				);
				if (!existing) {
					continue;
				}

				const resolution = await waitForConflictResolution(
					{
						kind: "folder-root",
						currentPath: destinationPath,
						rootId: root.id,
						fileName: root.resolvedName,
						allowedResolutions: ["duplicate", "skip"],
					},
					`Folder '${root.resolvedName}' already exists`,
				);

				if (resolution.action === "skip") {
					markRootSkipped(root.id);
					continue;
				}

				const unique = await getUniqueFolderName(
					destinationPath,
					targetProviderId,
				);
				root.resolvedName = unique.name;
			}

			transferManifest.preflightComplete = true;
			await persistManifest(transferManifest, "running");
		}

		const folderCache = new Map<string, Folder | null>();
		folderCache.set(targetFolder?.virtualPath ?? "/", targetFolder ?? null);

		const ensureFolderChain = async (
			root: TransferRootEntry | null,
			relativePath: string,
		): Promise<Folder | null> => {
			let currentFolder = targetFolder ?? null;
			let currentPath = targetFolder?.virtualPath ?? "/";
			const segments: string[] = [];

			if (root) {
				segments.push(root.resolvedName);
			}
			if (relativePath) {
				segments.push(...relativePath.split("/").filter(Boolean));
			}

			for (const segment of segments) {
				currentPath = joinPath(currentPath, segment);
				if (folderCache.has(currentPath)) {
					currentFolder = folderCache.get(currentPath) ?? null;
					continue;
				}

				const existing = await checkFolderConflict(
					currentPath,
					targetProviderId,
				);
				if (existing) {
					currentFolder = existing;
					folderCache.set(currentPath, existing);
					continue;
				}

				const remoteId = await resolvedTargetProvider.createFolder({
					name: segment,
					...(currentFolder?.remoteId
						? { parentId: currentFolder.remoteId }
						: {}),
				});
				const [createdFolder] = await db
					.insert(folders)
					.values({
						nodeType: "folder",
						virtualPath: currentPath,
						name: segment,
						remoteId,
						providerId: targetProviderId,
						workspaceId,
						parentId: currentFolder?.id ?? null,
						createdBy: userId,
						isDeleted: false,
					})
					.returning();

				if (!createdFolder) {
					throw new Error(`Failed to create folder at ${currentPath}`);
				}

				currentFolder = createdFolder;
				folderCache.set(currentPath, createdFolder);
			}

			return currentFolder;
		};

		for (const folderEntry of [...requireManifest().folders].sort(
			(a, b) => a.relativePath.length - b.relativePath.length,
		)) {
			if (folderEntry.status !== "pending") continue;
			const root = getRootById(folderEntry.sourceRootId);
			if (!root || root.status === "skipped") {
				folderEntry.status = "skipped";
				continue;
			}

			await assertNotCancelled();
			await ensureFolderChain(root, folderEntry.relativePath);
			folderEntry.status = "completed";
		}
		await persistManifest(requireManifest(), "running");

		const executeFileTransfer = async (
			fileEntry: TransferFileEntry,
			destinationFolder: Folder | null,
		) => {
			let file: Awaited<ReturnType<typeof getFile>>;
			try {
				file = await getFile(db, fileEntry.sourceFileId, userId, workspaceId);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(
					`Source file not found: ${fileEntry.sourceFileId} (${message})`,
				);
			}

			const destinationPath = joinPath(
				destinationFolder?.virtualPath ?? "/",
				fileEntry.name,
			);
			let finalDestinationPath = destinationPath;
			let finalFileName = fileEntry.name;

			const existingConflict = await checkFileConflict(
				destinationPath,
				targetProviderId,
				data.operation === "cut" ? file.id : undefined,
			);

			if (existingConflict) {
				const transferManifest = requireManifest();
				let resolution = transferManifest.applyToAllFileResolution ?? null;

				if (!resolution) {
					const conflictRelease = await conflictMutex.acquire();
					try {
						// Re-check after acquiring mutex — another file may have set applyToAll
						resolution = requireManifest().applyToAllFileResolution ?? null;
						if (!resolution) {
							const resolved = await waitForConflictResolution(
								{
									kind: "file",
									currentPath: destinationPath,
									fileName: fileEntry.name,
									allowedResolutions: ["duplicate", "overwrite", "skip"],
								},
								`File '${fileEntry.name}' already exists`,
							);
							resolution = resolved.action;
						}
					} finally {
						conflictRelease();
					}
				}

				if (resolution === "skip") {
					return { status: "skipped" as const };
				}

				if (resolution === "duplicate") {
					const unique = await getUniqueFilename(
						destinationPath,
						targetProviderId,
					);
					finalDestinationPath = unique.path;
					finalFileName = unique.name;
				}

				if (resolution === "overwrite") {
					const overwriteProvider = await getSourceProvider(targetProviderId);
					try {
						await overwriteProvider.delete({
							remoteId: existingConflict.remoteId,
							isFolder: false,
						});
					} catch (deleteError) {
						logger.warn({
							msg: "Failed to delete conflicting destination file",
							jobId,
							fileId: existingConflict.id,
							error:
								deleteError instanceof Error
									? deleteError.message
									: String(deleteError),
						});
					}
					await db.delete(files).where(eq(files.id, existingConflict.id));
				}
			}

			if (file.providerId === targetProviderId) {
				const sameProvider = await getSourceProvider(targetProviderId);
				await reportFileProgress(
					fileEntry,
					0.5,
					buildFileTransferMessage(
						data.operation === "cut" ? "Moving" : "Copying",
						fileEntry.name,
					),
				);

				const sameLimiterRelease =
					await getProviderLimiter(targetProviderId).acquire();
				try {
					if (data.operation === "cut") {
						await sameProvider.move({
							remoteId: file.remoteId,
							newParentId: destinationFolder?.remoteId,
							...(finalFileName !== file.name
								? { newName: finalFileName }
								: {}),
						});
						await db
							.update(files)
							.set({
								folderId: destinationFolder?.id ?? null,
								virtualPath: finalDestinationPath,
								name: finalFileName,
								updatedAt: new Date(),
							})
							.where(eq(files.id, file.id));
					} else {
						const copiedRemoteId = await sameProvider.copy({
							remoteId: file.remoteId,
							targetParentId: destinationFolder?.remoteId,
							...(finalFileName !== file.name
								? { newName: finalFileName }
								: {}),
						});
						await db.insert(files).values({
							nodeType: "file",
							virtualPath: finalDestinationPath,
							name: finalFileName,
							mimeType: file.mimeType,
							size: file.size,
							hash: file.hash,
							remoteId: copiedRemoteId,
							providerId: targetProviderId,
							workspaceId,
							folderId: destinationFolder?.id ?? null,
							uploadedBy: userId,
							isDeleted: false,
						});
					}
				} finally {
					sameLimiterRelease();
				}

				return {
					status: "completed" as const,
					finalDestinationPath,
				};
			}

			const sourceProvider = await getSourceProvider(file.providerId);
			const transferDir = join(
				getTransferCacheRoot(),
				workspaceId,
				file.id,
				jobId,
			);
			const cachedFilePath = join(transferDir, "payload.bin");
			await mkdir(transferDir, { recursive: true });

			let finalRemoteId: string | undefined;

			try {
				await reportFileProgress(
					fileEntry,
					0.05,
					buildFileTransferMessage("Downloading", fileEntry.name),
				);
				const srcLimiterRelease = await getProviderLimiter(
					file.providerId,
				).acquire();
				let sourceStream: ReadableStream<Uint8Array>;
				try {
					sourceStream = await sourceProvider.downloadFile(file.remoteId);
				} finally {
					srcLimiterRelease();
				}
				const reader = sourceStream.getReader();
				const handle = await open(cachedFilePath, "w");
				let downloadedBytes = 0;

				try {
					while (true) {
						await assertNotCancelled();
						const { done, value } = await reader.read();
						if (done) break;
						if (!value) continue;

						const chunk = Buffer.from(value);
						await handle.write(chunk, 0, chunk.length, downloadedBytes);
						downloadedBytes += chunk.length;

						await reportFileProgress(
							fileEntry,
							getTransferProgress(downloadedBytes, 0, file.size) * 0.5,
							buildFileTransferMessage("Downloading", fileEntry.name),
						);
					}
				} finally {
					await handle.close();
					reader.releaseLock();
				}

				await reportFileProgress(
					fileEntry,
					0.5,
					buildFileTransferMessage("Uploading", fileEntry.name),
				);

				if (
					resolvedTargetProvider.supportsChunkedUpload &&
					resolvedTargetProvider.initiateMultipartUpload &&
					resolvedTargetProvider.uploadPart &&
					resolvedTargetProvider.completeMultipartUpload
				) {
					const multipart =
						await resolvedTargetProvider.initiateMultipartUpload({
							name: finalFileName,
							mimeType: file.mimeType,
							size: file.size,
							parentId: destinationFolder?.remoteId,
						});
					finalRemoteId = multipart.remoteId;
					const cachedFile = Bun.file(cachedFilePath);
					const partCount = Math.max(
						1,
						Math.ceil(file.size / DEFAULT_TRANSFER_CHUNK_SIZE),
					);
					const parts: Array<{ partNumber: number; etag: string }> = [];

					for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
						await assertNotCancelled();
						const start = (partNumber - 1) * DEFAULT_TRANSFER_CHUNK_SIZE;
						const end = Math.min(
							start + DEFAULT_TRANSFER_CHUNK_SIZE,
							file.size,
						);
						const chunkData = Buffer.from(
							await cachedFile.slice(start, end).arrayBuffer(),
						);
						const tgtPartRelease =
							await getProviderLimiter(targetProviderId).acquire();
						let uploadResult: {
							partNumber: number;
							etag: string;
							finalRemoteId?: string;
						};
						try {
							uploadResult = await resolvedTargetProvider.uploadPart(
								multipart.uploadId,
								multipart.remoteId,
								partNumber,
								chunkData,
							);
						} finally {
							tgtPartRelease();
						}
						parts.push({
							partNumber: uploadResult.partNumber,
							etag: uploadResult.etag,
						});
						if (uploadResult.finalRemoteId) {
							finalRemoteId = uploadResult.finalRemoteId;
						}
						await reportFileProgress(
							fileEntry,
							0.5 + (partNumber / Math.max(partCount, 1)) * 0.5,
							buildFileTransferMessage("Uploading", fileEntry.name),
						);
					}

					await resolvedTargetProvider.completeMultipartUpload(
						multipart.uploadId,
						multipart.remoteId,
						parts,
					);
				} else {
					const tgtUpRelease =
						await getProviderLimiter(targetProviderId).acquire();
					try {
						const uploadResponse = await resolvedTargetProvider.requestUpload({
							name: finalFileName,
							mimeType: file.mimeType,
							size: file.size,
							parentId: destinationFolder?.remoteId,
						});
						finalRemoteId =
							(await resolvedTargetProvider.uploadFile(
								uploadResponse.fileId,
								Bun.file(cachedFilePath).stream(),
							)) ?? uploadResponse.fileId;
					} finally {
						tgtUpRelease();
					}
				}

				if (!finalRemoteId) {
					throw new Error("Target provider did not return a remote file id");
				}

				if (data.operation === "cut") {
					const sourceRemoteId = file.remoteId;
					const sourceProviderId = file.providerId;
					const [updated] = await db
						.update(files)
						.set({
							providerId: targetProviderId,
							remoteId: finalRemoteId,
							folderId: destinationFolder?.id ?? null,
							virtualPath: finalDestinationPath,
							name: finalFileName,
							updatedAt: new Date(),
						})
						.where(eq(files.id, file.id))
						.returning();

					if (!updated) {
						try {
							await resolvedTargetProvider.delete({
								remoteId: finalRemoteId,
								isFolder: false,
							});
						} catch {
							// Best effort cleanup only.
						}
						throw new Error("Failed to update file record after transfer");
					}

					try {
						await sourceProvider.delete({
							remoteId: sourceRemoteId,
							isFolder: false,
						});
					} catch (deleteError) {
						logger.warn({
							msg: "[transfer:root] source deletion failed after DB update; file duplicated on source provider",
							jobId,
							fileId: file.id,
							sourceProviderId,
							sourceRemoteId,
							error:
								deleteError instanceof Error
									? deleteError.message
									: String(deleteError),
						});
					}
				} else {
					const [inserted] = await db
						.insert(files)
						.values({
							nodeType: "file",
							virtualPath: finalDestinationPath,
							name: finalFileName,
							mimeType: file.mimeType,
							size: file.size,
							hash: file.hash,
							remoteId: finalRemoteId,
							providerId: targetProviderId,
							workspaceId,
							folderId: destinationFolder?.id ?? null,
							uploadedBy: userId,
							isDeleted: false,
						})
						.returning();

					if (!inserted) {
						try {
							await resolvedTargetProvider.delete({
								remoteId: finalRemoteId,
								isFolder: false,
							});
						} catch {
							// Best effort cleanup only.
						}
						throw new Error("Failed to insert copied file");
					}
				}

				return {
					status: "completed" as const,
					finalDestinationPath,
				};
			} finally {
				await rm(transferDir, { recursive: true, force: true }).catch(() => {});
			}
		};

		// ── Throttled manifest persistence ────────────────────────────────
		let pendingPersistCount = 0;
		let persistTimer: ReturnType<typeof setTimeout> | null = null;

		const scheduleManifestPersist = () => {
			pendingPersistCount++;
			if (pendingPersistCount >= PERSIST_BATCH_SIZE) {
				if (persistTimer) {
					clearTimeout(persistTimer);
					persistTimer = null;
				}
				pendingPersistCount = 0;
				persistManifest(requireManifest(), "running").catch(() => {});
				return;
			}
			if (!persistTimer) {
				persistTimer = setTimeout(() => {
					persistTimer = null;
					pendingPersistCount = 0;
					persistManifest(requireManifest(), "running").catch(() => {});
				}, PERSIST_INTERVAL_MS);
			}
		};

		const flushManifestPersist = async () => {
			if (persistTimer) {
				clearTimeout(persistTimer);
				persistTimer = null;
			}
			if (pendingPersistCount > 0) {
				pendingPersistCount = 0;
				await persistManifest(requireManifest(), "running");
			}
		};

		// ── Parallel file processing with bounded concurrency ─────────────
		const fileSemaphore = new Semaphore(FILE_CONCURRENCY);
		const conflictMutex = new Semaphore(1);

		const pendingFiles = requireManifest().files.filter(
			(f) => f.status === "pending",
		);

		const filePromises = pendingFiles.map(async (fileEntry) => {
			const root = getRootById(fileEntry.sourceRootId);
			if (root?.status === "skipped") {
				fileEntry.status = "skipped";
				scheduleManifestPersist();
				return;
			}

			const release = await fileSemaphore.acquire();
			try {
				await assertNotCancelled();

				const destinationFolder = await ensureFolderChain(
					root,
					fileEntry.relativeDirPath,
				);

				try {
					const result = await executeFileTransfer(
						fileEntry,
						destinationFolder,
					);
					fileEntry.status = result.status;
					if (result.status === "completed") {
						fileEntry.finalDestinationPath = result.finalDestinationPath;
					}
				} catch (error) {
					fileEntry.status = "failed";
					fileEntry.errorMessage =
						error instanceof Error ? error.message : String(error);
					logger.error({
						msg: "[transfer:root] individual file transfer failed",
						jobId,
						fileId: fileEntry.sourceFileId,
						sourceProviderId: fileEntry.sourceProviderId,
						sourcePath: fileEntry.sourceVirtualPath,
						targetProviderId,
						error: fileEntry.errorMessage,
						...(error instanceof DrivebaseError && error.details
							? { details: error.details }
							: {}),
					});
				}

				scheduleManifestPersist();
			} finally {
				release();
			}
		});

		await Promise.all(filePromises);
		await flushManifestPersist();

		if (data.operation === "cut") {
			for (const root of requireManifest().roots) {
				if (root.status === "skipped") continue;
				const rootFiles = requireManifest().files.filter(
					(file) => file.sourceRootId === root.id,
				);
				const canDeleteSource = rootFiles.every(
					(file) => file.status === "completed",
				);
				if (!canDeleteSource) {
					continue;
				}

				await markFolderSubtreeDeleted(
					workspaceId,
					root.sourceProviderId,
					root.sourceVirtualPath,
				);

				const sourceProvider = await getSourceProvider(root.sourceProviderId);
				try {
					await sourceProvider.delete({
						remoteId: root.sourceRemoteId,
						isFolder: true,
					});
				} catch (deleteError) {
					logger.warn({
						msg: "[transfer:root] source folder deletion failed after DB update; remote orphan remains",
						jobId,
						folderId: root.sourceFolderId,
						error:
							deleteError instanceof Error
								? deleteError.message
								: String(deleteError),
					});
				}
			}
		}

		const finalManifest = requireManifest();
		await persistManifest(
			finalManifest,
			finalManifest.failedFiles > 0 ? "failed" : "completed",
		);

		const completionMessage = getTransferCompletionMessage(finalManifest);
		const hasFailed = finalManifest.failedFiles > 0;

		if (hasFailed) {
			await activityService.fail(jobId, completionMessage);
		} else {
			await activityService.complete(jobId, completionMessage);
		}

		await activityService.log({
			kind: hasFailed
				? "transfer.session.failed"
				: "transfer.session.completed",
			title: hasFailed
				? "Transfer completed with errors"
				: "Transfer completed",
			summary: completionMessage,
			status: hasFailed ? "error" : "success",
			userId,
			workspaceId,
			details: {
				transferSessionId: session.id,
				jobId,
				operation: data.operation,
				totalFiles: finalManifest.totalFiles,
				completedFiles: finalManifest.completedFiles,
				failedFiles: finalManifest.failedFiles,
				skippedFiles: finalManifest.skippedFiles,
				...(hasFailed
					? {
							errors: finalManifest.files
								.filter((f) => f.status === "failed")
								.map((f) => ({
									name: f.name,
									sourcePath: f.sourceVirtualPath,
									error: f.errorMessage,
								})),
						}
					: {}),
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error({
			msg: "[transfer:root] root transfer failed",
			jobId,
			transferSessionId: session.id,
			error: message,
		});
		await updateTransferSession(db, session.id, {
			status: "failed",
			manifest,
		}).catch(() => {});
		await activityService.fail(jobId, message);
		await activityService
			.log({
				kind: "transfer.session.failed",
				title: "Transfer failed",
				summary: message,
				status: "error",
				userId,
				workspaceId,
				details: {
					transferSessionId: session.id,
					jobId,
					operation: data.operation,
					error: message,
					totalFiles: manifest?.totalFiles ?? 0,
					completedFiles: manifest?.completedFiles ?? 0,
					failedFiles: manifest?.failedFiles ?? 0,
					skippedFiles: manifest?.skippedFiles ?? 0,
					...(manifest?.files
						? {
								errors: manifest.files
									.filter((f) => f.status === "failed")
									.map((f) => ({
										name: f.name,
										sourcePath: f.sourceVirtualPath,
										error: f.errorMessage,
									})),
							}
						: {}),
				},
			})
			.catch(() => {});
	} finally {
		for (const provider of sourceProviders.values()) {
			await provider.cleanup().catch(() => {});
		}
		if (targetProvider) {
			await targetProvider.cleanup().catch(() => {});
		}
	}
}
