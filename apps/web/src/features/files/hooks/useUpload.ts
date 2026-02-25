import { matchesRule, type RuleConditionGroups } from "@drivebase/utils";
import axios from "axios";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useChunkedUpload } from "@/features/files/hooks/useChunkedUpload";
import {
	useDeleteFile,
	useRequestUpload,
} from "@/features/files/hooks/useFiles";
import { useProviders } from "@/features/providers/hooks/useProviders";
import { useFileRules } from "@/features/rules/hooks/useRules";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";
import type { StorageProvider } from "@/gql/graphql";
import { progressPanel } from "@/shared/lib/progressPanel";

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

	const activeProviders = useMemo(
		() => providersData?.storageProviders.filter((p) => p.isActive) || [],
		[providersData],
	);

	const activeProviderIds = useMemo(
		() => new Set(activeProviders.map((p) => p.id)),
		[activeProviders],
	);

	const enabledRules = useMemo(
		() =>
			(rulesResult.data?.fileRules ?? [])
				.filter((r) => r.enabled)
				.sort((a, b) => a.priority - b.priority),
		[rulesResult.data],
	);

	const { uploadChunked, cancelSession, retrySession } = useChunkedUpload();

	const getDestinationPath = (file: File): string | undefined => {
		for (const rule of enabledRules) {
			if (
				activeProviderIds.has(rule.destinationProviderId) &&
				matchesRule(rule.conditions as RuleConditionGroups, {
					name: file.name,
					mimeType: file.type,
					size: file.size,
				})
			) {
				if (rule.destinationFolder?.virtualPath) {
					return rule.destinationFolder.virtualPath;
				}
			}
		}
		return undefined;
	};

	const uploadSingleFile = async (
		file: File,
		providerId: string,
		ppId: string,
	) => {
		// Large files → chunked upload (uses progressPanel internally)
		if (file.size > CHUNK_THRESHOLD) {
			return uploadChunked(file, providerId, ppId, currentFolderId);
		}

		let createdFileId: string | undefined;
		progressPanel.update(ppId, {
			phase: "green",
			progress: 0,
			phaseLabel: "Uploading…",
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

			if (result.error) throw new Error(result.error.message);

			const { fileId, uploadUrl, uploadFields, useDirectUpload } =
				result.data?.requestUpload || {};
			createdFileId = fileId ?? undefined;

			if (!uploadUrl) throw new Error("Upload URL was not returned.");

			const onUploadProgress = (progressEvent: {
				loaded: number;
				total?: number;
			}) => {
				const total = progressEvent.total || file.size;
				const pct = Math.max(
					1,
					Math.round((progressEvent.loaded * 100) / total),
				);
				progressPanel.update(ppId, {
					progress: pct,
					phaseLabel: `Uploading… ${pct}%`,
				});
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
				const workspaceId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
				await axios({
					method,
					url: uploadUrl,
					data: file,
					headers: {
						"Content-Type": file.type,
						...(!useDirectUpload && token
							? { Authorization: `Bearer ${token}` }
							: {}),
						...(!useDirectUpload && workspaceId
							? { "x-workspace-id": workspaceId }
							: {}),
					},
					onUploadProgress,
				});
			}

			progressPanel.done(ppId, "Uploaded");
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
			progressPanel.error(ppId, String(message));
			return false;
		}
	};

	const handleUploadQueue = async (
		filesToUpload: File[],
		providerId: string,
	) => {
		setIsUploadDialogOpen(false);
		setIsUploading(true);

		// Create a progressPanel item for each file upfront
		const ppIds = filesToUpload.map((file) =>
			progressPanel.create({
				title: file.name,
				subtitle: formatBytes(file.size),
				phase: "green",
				progress: 0,
				phaseLabel: "Queued",
				...(getDestinationPath(file)
					? { subtitle: getDestinationPath(file) }
					: {}),
			}),
		);

		try {
			let successCount = 0;
			for (let i = 0; i < filesToUpload.length; i++) {
				const ok = await uploadSingleFile(
					filesToUpload[i],
					providerId,
					ppIds[i],
				);
				if (ok) successCount++;
			}
			if (successCount > 0) onUploadComplete();
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

	const handleUploadClick = () => fileInputRef.current?.click();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const incomingFiles = Array.from(e.target.files || []);
		e.target.value = "";
		handleFilesSelected(incomingFiles);
	};

	return {
		fileInputRef,
		isUploading,
		isUploadDialogOpen,
		setIsUploadDialogOpen,
		selectedFiles,
		activeProviders: activeProviders as StorageProvider[],
		handleUploadClick,
		handleFileChange,
		handleFilesSelected,
		handleUploadQueue,
		cancelSession,
		retrySession,
	};
}

function formatBytes(bytes: number) {
	if (!bytes) return "";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const exp = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}
