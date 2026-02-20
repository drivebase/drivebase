import axios from "axios";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { matchesRule, type RuleConditionGroups } from "@drivebase/utils";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useChunkedUpload } from "@/features/files/hooks/useChunkedUpload";
import {
	useDeleteFile,
	useRequestUpload,
} from "@/features/files/hooks/useFiles";
import type { UploadQueueItem } from "@/features/files/UploadProgressPanel";
import { useProviders } from "@/features/providers/hooks/useProviders";
import { useFileRules } from "@/features/rules/hooks/useRules";
import type { StorageProvider } from "@/gql/graphql";

const CHUNK_THRESHOLD = 50 * 1024 * 1024; // 50MB

interface UseUploadOptions {
	currentFolderId: string | undefined;
	onUploadComplete: () => void;
}

export function useUpload({
	currentFolderId,
	onUploadComplete,
}: UseUploadOptions) {
	const { token } = useAuthStore();
	const { data: providersData } = useProviders();
	const [rulesResult] = useFileRules();
	const [, requestUpload] = useRequestUpload();
	const [, deleteFile] = useDeleteFile();

	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

	const activeProviders = useMemo(() => {
		return providersData?.storageProviders.filter((p) => p.isActive) || [];
	}, [providersData]);

	const activeProviderIds = useMemo(
		() => new Set(activeProviders.map((p) => p.id)),
		[activeProviders],
	);

	const enabledRules = useMemo(() => {
		return (rulesResult.data?.fileRules ?? [])
			.filter((r) => r.enabled)
			.sort((a, b) => a.priority - b.priority);
	}, [rulesResult.data]);

	const updateQueueItem = useCallback(
		(id: string, patch: Partial<UploadQueueItem>) => {
			setUploadQueue((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
			);
		},
		[],
	);

	// Chunked upload hook for large files
	const { uploadChunked, cancelSession, retrySession } = useChunkedUpload({
		onProgress: updateQueueItem,
	});

	const uploadSingleFile = async (
		file: File,
		providerId: string,
		queueId: string,
	) => {
		// Route large files to chunked upload
		if (file.size > CHUNK_THRESHOLD) {
			return uploadChunked(file, providerId, queueId, currentFolderId);
		}

		// Existing small file upload path (unchanged)
		let createdFileId: string | undefined;
		updateQueueItem(queueId, {
			status: "uploading",
			progress: 0,
			error: undefined,
		});

		try {
			const result = await requestUpload({
				input: {
					name: file.name,
					mimeType: file.type,
					size: file.size,
					folderId: currentFolderId,
					providerId,
				},
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			const { fileId, uploadUrl, uploadFields, useDirectUpload } =
				result.data?.requestUpload || {};
			createdFileId = fileId ?? undefined;

			if (!uploadUrl) {
				throw new Error("Upload URL was not returned.");
			}

			const onUploadProgress = (progressEvent: {
				loaded: number;
				total?: number;
			}) => {
				const total = progressEvent.total || file.size;
				const percent = Math.max(
					1,
					Math.round((progressEvent.loaded * 100) / total),
				);
				updateQueueItem(queueId, { progress: percent });
			};

			if (uploadFields) {
				const formData = new FormData();
				Object.entries(uploadFields).forEach(([key, value]) => {
					formData.append(key, value as string);
				});
				formData.append("file", file);
				await axios.post(uploadUrl, formData, { onUploadProgress });
			} else {
				const method = useDirectUpload ? "PUT" : "POST";
				await axios({
					method,
					url: uploadUrl,
					data: file,
					headers: {
						"Content-Type": file.type,
						...(!useDirectUpload && token
							? { Authorization: `Bearer ${token}` }
							: {}),
					},
					onUploadProgress,
				});
			}

			updateQueueItem(queueId, { status: "success", progress: 100 });
			return true;
		} catch (error: unknown) {
			if (createdFileId) {
				try {
					await deleteFile({ id: createdFileId });
				} catch (cleanupError) {
					console.error(
						"Failed to cleanup file record after upload failure:",
						cleanupError,
					);
				}
			}

			const axiosError = error as {
				response?: { data?: string };
				message?: string;
			};
			const message =
				axiosError.response?.data || axiosError.message || "Upload failed";
			updateQueueItem(queueId, {
				status: "error",
				error: String(message),
				progress: 100,
			});
			return false;
		}
	};

	const handleUploadQueue = async (
		filesToUpload: File[],
		providerId: string,
	) => {
		setIsUploadDialogOpen(false);
		setIsUploading(true);
		const now = Date.now();
		const queueItems: UploadQueueItem[] = filesToUpload.map((file, index) => ({
			id: `${now}-${index}-${file.name}`,
			name: file.name,
			size: file.size,
			progress: 0,
			status: "queued",
		}));
		setUploadQueue((prev) => [...prev, ...queueItems]);

		try {
			let successCount = 0;
			for (let index = 0; index < filesToUpload.length; index += 1) {
				const ok = await uploadSingleFile(
					filesToUpload[index],
					providerId,
					queueItems[index].id,
				);
				if (ok) successCount += 1;
			}
			if (successCount > 0) {
				onUploadComplete();
			}
		} finally {
			setIsUploading(false);
			setSelectedFiles([]);
		}
	};

	const handleFilesSelected = (incomingFiles: File[]) => {
		if (!incomingFiles.length) return;
		if (activeProviders.length === 1) {
			handleUploadQueue(incomingFiles, activeProviders[0].id);
		} else if (activeProviders.length > 1) {
			// Skip the provider dialog if every file is covered by a matching rule
			// whose destination provider is currently active.
			const allFilesHaveRule = incomingFiles.every((file) =>
				enabledRules.some(
					(rule) =>
						activeProviderIds.has(rule.destinationProviderId) &&
						matchesRule(rule.conditions as RuleConditionGroups, {
							name: file.name,
							mimeType: file.type,
							size: file.size,
						}),
				),
			);

			if (allFilesHaveRule) {
				// The backend will apply the matching rule and route each file to
				// the correct provider; pass the first active provider as a placeholder.
				handleUploadQueue(incomingFiles, activeProviders[0].id);
			} else {
				setSelectedFiles(incomingFiles);
				setIsUploadDialogOpen(true);
			}
		} else {
			toast.error(
				"No active storage providers found. Please connect a provider first.",
			);
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const incomingFiles = Array.from(e.target.files || []);
		e.target.value = "";
		handleFilesSelected(incomingFiles);
	};

	const clearUploadQueue = () => setUploadQueue([]);

	const restoreSessions = useCallback((items: UploadQueueItem[]) => {
		setUploadQueue((prev) => {
			// Avoid duplicates by sessionId
			const existingSessionIds = new Set(
				prev.filter((i) => i.sessionId).map((i) => i.sessionId),
			);
			const newItems = items.filter(
				(i) => !i.sessionId || !existingSessionIds.has(i.sessionId),
			);
			return [...prev, ...newItems];
		});
	}, []);

	return {
		fileInputRef,
		isUploading,
		isUploadDialogOpen,
		setIsUploadDialogOpen,
		selectedFiles,
		uploadQueue,
		activeProviders: activeProviders as StorageProvider[],
		handleUploadClick,
		handleFileChange,
		handleFilesSelected,
		handleUploadQueue,
		clearUploadQueue,
		restoreSessions,
		updateQueueItem,
		cancelSession,
		retrySession,
	};
}
