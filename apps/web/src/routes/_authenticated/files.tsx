import { createFileRoute } from "@tanstack/react-router";
import axios from "axios";
import { ChevronRight, FolderPlus, Home, Loader2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CreateFolderDialog } from "@/features/files/CreateFolderDialog";
import { FileSystemTable } from "@/features/files/FileSystemTable";
import {
	UploadProgressPanel,
	type UploadQueueItem,
} from "@/features/files/UploadProgressPanel";
import { UploadProviderDialog } from "@/features/files/UploadProviderDialog";
import { useFileActions } from "@/features/files/useFileActions";
import type {
	FileItemFragment,
	FolderItemFragment,
	StorageProvider,
} from "@/gql/graphql";
import {
	useContents,
	useDeleteFile,
	useRequestUpload,
	useStarFile,
	useUnstarFile,
} from "@/hooks/useFiles";
import {
	useDeleteFolder,
	useStarFolder,
	useUnstarFolder,
} from "@/hooks/useFolders";
import { useProviders } from "@/hooks/useProviders";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const searchSchema = z.object({
	path: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/files")({
	validateSearch: (search) => searchSchema.parse(search),
	component: FilesPage,
});

function FilesPage() {
	const { token } = useAuthStore();
	const { path: searchPath } = Route.useSearch();
	const navigate = Route.useNavigate();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const { downloadFile, showDetails } = useFileActions();

	const currentPath = searchPath || "/";

	// Fetch contents using the path
	const [{ data: contentsData, fetching: contentsFetching }, refreshContents] =
		useContents(currentPath);
	const { data: providersData } = useProviders();
	const [, requestUpload] = useRequestUpload();
	const [, deleteFile] = useDeleteFile();
	const [, deleteFolder] = useDeleteFolder();
	const [, starFile] = useStarFile();
	const [, unstarFile] = useUnstarFile();
	const [, starFolder] = useStarFolder();
	const [, unstarFolder] = useUnstarFolder();

	const activeProviders = useMemo(() => {
		return providersData?.storageProviders.filter((p) => p.isActive) || [];
	}, [providersData]);

	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragActive, setIsDragActive] = useState(false);
	const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
	const dragDepthRef = useRef(0);

	const [folders, setFolders] = useState<FolderItemFragment[]>([]);
	const [files, setFiles] = useState<FileItemFragment[]>([]);
	useEffect(() => {
		setFolders((contentsData?.contents?.folders || []) as FolderItemFragment[]);
		setFiles((contentsData?.contents?.files || []) as FileItemFragment[]);
	}, [contentsData?.contents?.folders, contentsData?.contents?.files]);

	const currentFolder = contentsData?.contents?.folder as
		| FolderItemFragment
		| undefined;

	// Generate breadcrumbs from path
	const breadcrumbs = useMemo(() => {
		if (currentPath === "/") return [];
		const parts = currentPath.split("/").filter(Boolean);
		return parts.map((part, index) => ({
			name: part,
			path: `/${parts.slice(0, index + 1).join("/")}`,
		}));
	}, [currentPath]);

	const handleNavigate = (folderId: string) => {
		const targetFolder = folders.find((f) => f.id === folderId);
		if (targetFolder) {
			navigate({
				search: { path: targetFolder.virtualPath },
			});
		}
	};

	const handleBreadcrumbClick = (path: string) => {
		navigate({
			search: { path },
		});
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFilesSelected = (incomingFiles: File[]) => {
		if (!incomingFiles.length) return;
		if (activeProviders.length === 1) {
			handleUploadQueue(incomingFiles, activeProviders[0].id);
		} else if (activeProviders.length > 1) {
			setSelectedFiles(incomingFiles);
			setIsUploadDialogOpen(true);
		} else {
			toast.error(
				"No active storage providers found. Please connect a provider first.",
			);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const incomingFiles = Array.from(e.target.files || []);
		e.target.value = ""; // Reset input
		handleFilesSelected(incomingFiles);
	};

	const updateQueueItem = (id: string, patch: Partial<UploadQueueItem>) => {
		setUploadQueue((prev) =>
			prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
		);
	};

	const uploadSingleFile = async (
		file: File,
		providerId: string,
		queueId: string,
	) => {
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
					folderId: currentFolder?.id,
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

			const onUploadProgress = (progressEvent: any) => {
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
		} catch (error: any) {
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

			const message = error.response?.data || error.message || "Upload failed";
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
				refreshContents({ requestPolicy: "network-only" });
			}
		} finally {
			setIsUploading(false);
			setSelectedFiles([]);
		}
	};

	const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		dragDepthRef.current += 1;
		if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
			setIsDragActive(true);
		}
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		dragDepthRef.current -= 1;
		if (dragDepthRef.current <= 0) {
			setIsDragActive(false);
			dragDepthRef.current = 0;
		}
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragActive(false);
		dragDepthRef.current = 0;
		const droppedFiles = Array.from(e.dataTransfer.files || []);
		handleFilesSelected(droppedFiles);
	};

	const handleToggleFileFavorite = async (file: FileItemFragment) => {
		const currentStarred =
			files.find((f) => f.id === file.id)?.starred ?? file.starred;
		setFiles((prev) =>
			prev.map((f) =>
				f.id === file.id ? { ...f, starred: !currentStarred } : f,
			),
		);

		try {
			const result = currentStarred
				? await unstarFile({ id: file.id })
				: await starFile({ id: file.id });

			if (result.error) {
				throw new Error(result.error.message);
			}

			toast.success(
				currentStarred
					? `Removed ${file.name} from favorites`
					: `Added ${file.name} to favorites`,
			);
		} catch (error) {
			setFiles((prev) =>
				prev.map((f) =>
					f.id === file.id ? { ...f, starred: currentStarred } : f,
				),
			);
			const message =
				error instanceof Error
					? error.message
					: "Failed to update favorite status.";
			toast.error(message);
		}
	};

	const handleToggleFolderFavorite = async (folder: FolderItemFragment) => {
		const currentStarred =
			folders.find((f) => f.id === folder.id)?.starred ?? folder.starred;
		setFolders((prev) =>
			prev.map((f) =>
				f.id === folder.id ? { ...f, starred: !currentStarred } : f,
			),
		);

		try {
			const result = currentStarred
				? await unstarFolder({ id: folder.id })
				: await starFolder({ id: folder.id });

			if (result.error) {
				throw new Error(result.error.message);
			}

			toast.success(
				currentStarred
					? `Removed ${folder.name} from favorites`
					: `Added ${folder.name} to favorites`,
			);
		} catch (error) {
			setFolders((prev) =>
				prev.map((f) =>
					f.id === folder.id ? { ...f, starred: currentStarred } : f,
				),
			);
			const message =
				error instanceof Error
					? error.message
					: "Failed to update favorite status.";
			toast.error(message);
		}
	};

	const handleDeleteSelection = async (selection: {
		files: FileItemFragment[];
		folders: FolderItemFragment[];
	}) => {
		const { files: selectedFilesToDelete, folders: selectedFoldersToDelete } =
			selection;
		if (
			selectedFilesToDelete.length === 0 &&
			selectedFoldersToDelete.length === 0
		)
			return;

		const selectedFolderPaths = selectedFoldersToDelete
			.map((folder) => folder.virtualPath)
			.filter(Boolean);

		const filesToDelete = selectedFilesToDelete.filter(
			(file) =>
				!selectedFolderPaths.some(
					(folderPath) =>
						file.virtualPath === folderPath ||
						file.virtualPath.startsWith(`${folderPath}/`),
				),
		);

		const foldersToDelete = [...selectedFoldersToDelete].sort(
			(a, b) => b.virtualPath.length - a.virtualPath.length,
		);

		let successCount = 0;
		let failedCount = 0;

		for (const file of filesToDelete) {
			const result = await deleteFile({ id: file.id });
			if (result.error) {
				failedCount += 1;
			} else {
				successCount += 1;
			}
		}

		for (const folder of foldersToDelete) {
			const result = await deleteFolder({ id: folder.id });
			if (result.error) {
				failedCount += 1;
			} else {
				successCount += 1;
			}
		}

		const folderPathsSet = new Set(selectedFolderPaths);
		const fileIdsSet = new Set(filesToDelete.map((file) => file.id));
		const folderIdsSet = new Set(foldersToDelete.map((folder) => folder.id));

		setFiles((prev) =>
			prev.filter(
				(file) =>
					!fileIdsSet.has(file.id) &&
					![...folderPathsSet].some(
						(folderPath) =>
							file.virtualPath === folderPath ||
							file.virtualPath.startsWith(`${folderPath}/`),
					),
			),
		);

		setFolders((prev) =>
			prev.filter(
				(folder) =>
					!folderIdsSet.has(folder.id) &&
					![...folderPathsSet].some(
						(folderPath) =>
							folder.virtualPath !== folderPath &&
							folder.virtualPath.startsWith(`${folderPath}/`),
					),
			),
		);

		if (successCount > 0) {
			refreshContents({ requestPolicy: "network-only" });
		}

		if (failedCount === 0) {
			toast.success(
				`Deleted ${successCount} item${successCount > 1 ? "s" : ""}`,
			);
		} else {
			toast.warning(
				`Deleted ${successCount} item(s). Failed to delete ${failedCount} item(s).`,
			);
		}
	};

	return (
		<div
			className="p-8 flex flex-col gap-6 h-full relative"
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			{/* Header Actions */}
			<div className="flex items-center justify-between">
				{/* Breadcrumbs */}
				<div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg w-fit">
					<Button
						variant="ghost"
						size="sm"
						className={cn(
							"h-6 px-2 hover:bg-muted hover:text-foreground transition-colors",
							currentPath === "/" &&
								"text-foreground font-medium pointer-events-none",
						)}
						onClick={() => handleBreadcrumbClick("/")}
					>
						<Home size={14} className="mr-1" />
						Home
					</Button>
					{breadcrumbs.map((crumb, index) => (
						<div key={crumb.path} className="flex items-center">
							<ChevronRight size={14} className="mx-1 opacity-50" />
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									"h-6 px-2 hover:bg-muted hover:text-foreground transition-colors",
									index === breadcrumbs.length - 1 &&
										"text-foreground font-medium pointer-events-none",
								)}
								onClick={() => handleBreadcrumbClick(crumb.path)}
							>
								{crumb.name}
							</Button>
						</div>
					))}
				</div>

				<div className="flex gap-2">
					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileChange}
						multiple
						className="hidden"
					/>
					<Button
						onClick={handleUploadClick}
						disabled={isUploading || contentsFetching}
						variant="outline"
					>
						{isUploading ? (
							<Loader2 className="animate-spin mr-2" size={18} />
						) : (
							<Upload size={18} className="mr-2" />
						)}
						Upload File
					</Button>
					<Button
						onClick={() => setIsCreateDialogOpen(true)}
						disabled={contentsFetching}
					>
						<FolderPlus size={18} className="mr-2" />
						New Folder
					</Button>
				</div>
			</div>

			{/* Content Area - Single Table */}
			<div className="flex-1 overflow-y-auto rounded-xl">
				<FileSystemTable
					files={files}
					folders={folders}
					onNavigate={handleNavigate}
					onDownloadFile={downloadFile}
					onShowFileDetails={showDetails}
					onToggleFileFavorite={handleToggleFileFavorite}
					onToggleFolderFavorite={handleToggleFolderFavorite}
					onDeleteSelection={handleDeleteSelection}
					isLoading={contentsFetching}
					showSharedColumn
				/>
			</div>

			<CreateFolderDialog
				isOpen={isCreateDialogOpen}
				onClose={() => setIsCreateDialogOpen(false)}
				parentId={currentFolder?.id}
			/>

			<UploadProviderDialog
				isOpen={isUploadDialogOpen}
				onClose={() => setIsUploadDialogOpen(false)}
				providers={activeProviders as StorageProvider[]}
				fileName={selectedFiles[0]?.name}
				fileMimeType={selectedFiles[0]?.type}
				fileSize={selectedFiles[0]?.size}
				onSelectProvider={(providerId) =>
					handleUploadQueue(selectedFiles, providerId)
				}
			/>

			{isDragActive ? (
				<div className="absolute inset-4 rounded-xl border-2 border-dashed border-primary bg-primary/10 z-40 flex items-center justify-center pointer-events-none">
					<div className="text-center">
						<div className="text-base font-semibold text-foreground">
							Drop files to upload
						</div>
						<div className="text-sm text-muted-foreground">
							Supports multiple files
						</div>
					</div>
				</div>
			) : null}

			<UploadProgressPanel
				items={uploadQueue}
				onClose={() => setUploadQueue([])}
			/>
		</div>
	);
}
