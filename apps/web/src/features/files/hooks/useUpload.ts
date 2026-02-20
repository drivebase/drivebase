import axios from "axios";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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

// ---------------------------------------------------------------------------
// Client-side rule matching (mirrors apps/api/services/rules/rule-engine.ts)
// ---------------------------------------------------------------------------

type RuleConditionField = "mimeType" | "extension" | "size" | "name";

type RuleConditionOperator =
	| "equals"
	| "notEquals"
	| "contains"
	| "startsWith"
	| "endsWith"
	| "in"
	| "greaterThan"
	| "lessThan"
	| "greaterThanOrEqual"
	| "lessThanOrEqual";

interface RuleCondition {
	field: RuleConditionField;
	operator: RuleConditionOperator;
	value: string | number | string[];
}

interface RuleConditionGroup {
	conditions: RuleCondition[];
}

interface RuleConditionGroups {
	groups: RuleConditionGroup[];
}

function extractExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot === -1 || lastDot === filename.length - 1) return "";
	return filename.slice(lastDot + 1).toLowerCase();
}

function matchString(
	actual: string,
	operator: RuleConditionOperator,
	value: string | number | string[],
): boolean {
	const normalized = actual.toLowerCase();
	switch (operator) {
		case "equals":
			return normalized === String(value).toLowerCase();
		case "notEquals":
			return normalized !== String(value).toLowerCase();
		case "contains":
			return normalized.includes(String(value).toLowerCase());
		case "startsWith":
			return normalized.startsWith(String(value).toLowerCase());
		case "endsWith":
			return normalized.endsWith(String(value).toLowerCase());
		case "in": {
			const values = Array.isArray(value) ? value : String(value).split(",");
			return values.some((v) => normalized === v.trim().toLowerCase());
		}
		default:
			return false;
	}
}

function matchNumeric(
	actual: number,
	operator: RuleConditionOperator,
	value: string | number | string[],
): boolean {
	const numValue = Number(value);
	if (Number.isNaN(numValue)) return false;
	switch (operator) {
		case "equals":
			return actual === numValue;
		case "notEquals":
			return actual !== numValue;
		case "greaterThan":
			return actual > numValue;
		case "lessThan":
			return actual < numValue;
		case "greaterThanOrEqual":
			return actual >= numValue;
		case "lessThanOrEqual":
			return actual <= numValue;
		default:
			return false;
	}
}

function matchesCondition(
	condition: RuleCondition,
	file: { name: string; mimeType: string; size: number },
): boolean {
	const { field, operator, value } = condition;
	switch (field) {
		case "extension":
			return matchString(extractExtension(file.name), operator, value);
		case "mimeType":
			return matchString(file.mimeType, operator, value);
		case "name":
			return matchString(file.name, operator, value);
		case "size":
			return matchNumeric(file.size, operator, value);
		default:
			return false;
	}
}

function fileMatchesRuleConditions(
	conditions: RuleConditionGroups,
	file: { name: string; mimeType: string; size: number },
): boolean {
	const { groups } = conditions;
	if (!groups || groups.length === 0) return false;
	return groups.some(
		(group) =>
			group.conditions.length > 0 &&
			group.conditions.every((c) => matchesCondition(c, file)),
	);
}

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
						fileMatchesRuleConditions(rule.conditions as RuleConditionGroups, {
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
