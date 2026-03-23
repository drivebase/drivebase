import {
	DndContext,
	DragOverlay,
	type Modifier,
	pointerWithin,
} from "@dnd-kit/core";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useActions } from "@/features/files/actions/useActions";
import { CreateFolderDialog } from "@/features/files/CreateFolderDialog";
import { DestinationProviderDialog } from "@/features/files/DestinationProviderDialog";
import { FileDropZone } from "@/features/files/components/FileDropZone";
import { FileExplorer } from "@/features/files/components/FileExplorer";
import { FilesToolbar } from "@/features/files/components/FilesToolbar";
import { DragOverlayContent } from "@/features/files/components/file-system-table/DragOverlayContent";
import { FileExplorerProvider } from "@/features/files/context/FileExplorerProvider";
import { useBreadcrumbs } from "@/features/files/hooks/useBreadcrumbs";
import { useDownload } from "@/features/files/hooks/useDownload";
import { useDragAndDrop } from "@/features/files/hooks/useDragAndDrop";
import { useFileDrop } from "@/features/files/hooks/useFileDrop";
import { useFileOperations } from "@/features/files/hooks/useFileOperations";
import { useContents } from "@/features/files/hooks/useFiles";
import { useUpload } from "@/features/files/hooks/useUpload";
import { useUploadSessionRestore } from "@/features/files/hooks/useUploadSessionRestore";
import { useClipboardStore } from "@/features/files/store/clipboardStore";
import { UploadProviderDialog } from "@/features/files/UploadProviderDialog";
import { useFileActions } from "@/features/files/useFileActions";
import { useProviders } from "@/features/providers/hooks/useProviders";
import { can, getActiveWorkspaceId } from "@/features/workspaces";
import { useWorkspaceMembers } from "@/features/workspaces/hooks/useWorkspaces";
import {
	JobStatus,
	type FileItemFragment,
	type FolderItemFragment,
} from "@/gql/graphql";
import { useActivityStore } from "@/shared/store/activityStore";

/**
 * Modifier that positions the drag overlay chip near the cursor
 * with a small offset (like Google Drive).
 */
const snapToCursor: Modifier = ({
	activatorEvent,
	draggingNodeRect,
	transform,
}) => {
	if (!activatorEvent || !draggingNodeRect) return transform;
	const e = activatorEvent as PointerEvent;
	// Offset so the overlay top-left is near the cursor with a small nudge
	const offsetX = e.clientX - draggingNodeRect.left - 8;
	const offsetY = e.clientY - draggingNodeRect.top - 8;
	return {
		...transform,
		x: transform.x + offsetX,
		y: transform.y + offsetY,
	};
};

const searchSchema = z.object({
	folderId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/files")({
	validateSearch: (search) => searchSchema.parse(search),
	component: FilesPage,
});

function FilesPage() {
	const { folderId } = Route.useSearch();
	const navigate = Route.useNavigate();
	const scrollRef = useRef<HTMLDivElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		const check = () => setIsOverflowing(el.scrollHeight > el.clientHeight);
		check();

		const observer = new ResizeObserver(check);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [filterProviderIds, setFilterProviderIds] = useState<string[]>([]);
	const [destinationDialogState, setDestinationDialogState] = useState<{
		title: string;
		description: string;
		resolve: (providerId: string | null) => void;
	} | null>(null);
	const { showDetails, createDownloadLink } = useFileActions();
	const { downloadFile } = useDownload();
	const clipboardMode = useClipboardStore((s) => s.mode);
	const clipboardItems = useClipboardStore((s) => s.items);
	const clipboardStatus = useClipboardStore((s) => s.status);
	const pendingJobIds = useClipboardStore((s) => s.pendingJobIds);
	const stageClipboard = useClipboardStore((s) => s.stageClipboard);
	const markTransferring = useClipboardStore((s) => s.markTransferring);
	const clearClipboard = useClipboardStore((s) => s.clearClipboard);
	const jobsMap = useActivityStore((s) => s.jobs);
	const { data: providersData } = useProviders();
	const currentUserId = useAuthStore((state) => state.user?.id ?? null);
	const activeWorkspaceId = getActiveWorkspaceId() ?? "";
	const [membersResult] = useWorkspaceMembers(
		activeWorkspaceId,
		!activeWorkspaceId,
	);
	const currentWorkspaceRole =
		membersResult.data?.workspaceMembers.find((m) => m.userId === currentUserId)
			?.role ?? null;
	const canWriteFiles = can(currentWorkspaceRole, "files.write");
	const [{ data: contentsData, fetching: contentsFetching }, refreshContents] =
		useContents(
			folderId ?? null,
			filterProviderIds.length ? filterProviderIds : undefined,
		);

	const currentFolder = contentsData?.contents?.folder as
		| FolderItemFragment
		| undefined;

	const { files, folders, fileList, folderList, ...operations } =
		useFileOperations({
			serverFiles: contentsData?.contents?.files as
				| FileItemFragment[]
				| undefined,
			serverFolders: contentsData?.contents?.folders as
				| FolderItemFragment[]
				| undefined,
			onMutationComplete: () =>
				refreshContents({ requestPolicy: "network-only" }),
		});

	const upload = useUpload({
		currentFolderId: folderId,
		currentFolderProviderId: currentFolder?.providerId,
		onUploadComplete: () => refreshContents({ requestPolicy: "network-only" }),
	});

	useUploadSessionRestore();

	const breadcrumbs = useBreadcrumbs(currentFolder);
	const { isDragActive, dragHandlers } = useFileDrop({
		onDrop: upload.handleFilesSelected,
	});

	const handleNavigate = useCallback(
		(targetFolderId: string) => {
			navigate({ search: { folderId: targetFolderId } });
		},
		[navigate],
	);

	const handleBreadcrumbClick = (targetFolderId: string | null) => {
		navigate({ search: { folderId: targetFolderId ?? undefined } });
	};

	const refresh = useCallback(
		() => refreshContents({ requestPolicy: "network-only" }),
		[refreshContents],
	);

	const providers = (providersData?.storageProviders ?? []).map((p) => ({
		id: p.id,
		name: p.name,
		type: p.type,
	}));
	const activeProviders =
		providersData?.storageProviders?.filter((p) => p.isActive) ?? [];

	const chooseDestinationProvider = useCallback(
		(title: string, description: string) => {
			if (folderId) {
				return Promise.resolve<string | null>(
					currentFolder?.providerId ?? null,
				);
			}
			if (activeProviders.length === 0) {
				return Promise.resolve<string | null>(null);
			}
			if (activeProviders.length === 1) {
				return Promise.resolve<string | null>(activeProviders[0]?.id ?? null);
			}

			return new Promise<string | null>((resolve) => {
				setDestinationDialogState({ title, description, resolve });
			});
		},
		[activeProviders, currentFolder?.providerId, folderId],
	);

	const dnd = useDragAndDrop({
		fileList,
		folderList,
		syncEnabled: true,
		resolveRootProviderId: async (items) => {
			if (folderId) {
				return currentFolder?.providerId ?? null;
			}
			return chooseDestinationProvider(
				"Choose Destination Provider",
				items.length === 1
					? `Select which provider root should receive "${items[0]?.name ?? "this item"}".`
					: "Select which provider root should receive the dropped items.",
			);
		},
		onMoveComplete: () => refreshContents({ requestPolicy: "network-only" }),
	});

	const registry = useActions({
		canWrite: canWriteFiles,
		downloadFile,
		showDetails,
		createDownloadLink,
		renameFile: operations.handleRenameFile,
		renameFolder: operations.handleRenameFolder,
		toggleFileFavorite: operations.handleToggleFileFavorite,
		toggleFolderFavorite: operations.handleToggleFolderFavorite,
		deleteSelection: operations.handleDeleteSelection,
		stageClipboard,
		pasteSelection: async (targetFolderId) => {
			if (!clipboardMode || clipboardItems.length === 0) return;
			const targetProviderId =
				targetFolderId || folderId
					? null
					: await chooseDestinationProvider(
							"Choose Destination Provider",
							"Select which provider root should receive the pasted items.",
						);
			if (!targetFolderId && !folderId && !targetProviderId) {
				return;
			}
			const result = await operations.handlePasteSelection(
				clipboardMode,
				targetFolderId,
				targetProviderId,
				clipboardItems,
			);
			if (result.jobs.length > 0) {
				markTransferring(result.jobs.map((job) => job.id));
				return;
			}
			if (result.requiresRefresh) {
				clearClipboard();
			}
		},
	});

	useEffect(() => {
		if (clipboardStatus !== "transferring" || pendingJobIds.length === 0) {
			return;
		}

		const pendingJobs = pendingJobIds
			.map((id) => jobsMap.get(id))
			.filter(
				(job): job is NonNullable<typeof job> =>
					job !== undefined && job !== null,
			);
		if (pendingJobs.length < pendingJobIds.length) {
			return;
		}

		const hasActive = pendingJobs.some(
			(job) =>
				job.status === JobStatus.Pending || job.status === JobStatus.Running,
		);
		if (hasActive) {
			return;
		}

		void refreshContents({ requestPolicy: "network-only" });
		clearClipboard();
	}, [
		clipboardStatus,
		pendingJobIds,
		jobsMap,
		refreshContents,
		clearClipboard,
	]);

	return (
		<DndContext
			sensors={dnd.sensors}
			collisionDetection={pointerWithin}
			onDragStart={dnd.handleDragStart}
			onDragEnd={dnd.handleDragEnd}
			onDragCancel={dnd.handleDragCancel}
		>
			<div
				className="pt-8 px-8 flex h-full min-h-0 flex-col gap-6 overflow-hidden relative"
				{...dragHandlers}
			>
				<FilesToolbar
					isRoot={!folderId}
					breadcrumbs={breadcrumbs}
					canWriteFiles={canWriteFiles}
					isUploading={upload.isUploading}
					isLoading={contentsFetching}
					providers={
						providersData?.storageProviders?.filter((p) => p.isActive) ?? []
					}
					filterProviderIds={filterProviderIds}
					onFilterChange={setFilterProviderIds}
					onBreadcrumbClick={handleBreadcrumbClick}
					onUploadClick={() => canWriteFiles && upload.handleUploadClick()}
					onNewFolder={() => canWriteFiles && setIsCreateDialogOpen(true)}
					fileInputRef={upload.fileInputRef}
					onFileChange={upload.handleFileChange}
				/>

				<div className="relative flex-1 min-h-0">
					<FileExplorerProvider
						registry={registry}
						files={files}
						folders={folders}
						providers={providers}
						currentFolderId={folderId}
						currentFolderName={currentFolder?.name}
						isLoading={contentsFetching}
						canWrite={canWriteFiles}
						navigate={handleNavigate}
						refresh={refresh}
					>
						<div className="h-full min-h-0">
							<FileExplorer contentRef={scrollRef} />
						</div>
					</FileExplorerProvider>
					{isOverflowing && (
						<div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-16 bg-gradient-to-t from-background to-transparent" />
					)}
				</div>

				{canWriteFiles ? (
					<CreateFolderDialog
						isOpen={isCreateDialogOpen}
						onClose={() => setIsCreateDialogOpen(false)}
						parentId={currentFolder?.id}
						currentFolderName={currentFolder?.name}
						currentFolderProviderId={currentFolder?.providerId}
						currentFolderProviderName={
							providersData?.storageProviders?.find(
								(provider) => provider.id === currentFolder?.providerId,
							)?.name
						}
						providers={providersData?.storageProviders}
						onCreated={(folder) => {
							folderList.addItem(folder as FolderItemFragment);
							refreshContents({ requestPolicy: "network-only" });
						}}
					/>
				) : null}

				<UploadProviderDialog
					isOpen={upload.isUploadDialogOpen}
					onClose={() => upload.setIsUploadDialogOpen(false)}
					providers={upload.activeProviders}
					fileName={upload.selectedFiles[0]?.name}
					fileMimeType={upload.selectedFiles[0]?.type}
					fileSize={upload.selectedFiles[0]?.size}
					onSelectProvider={(providerId) =>
						upload.handleUploadQueue(upload.selectedFiles, providerId)
					}
				/>

				<DestinationProviderDialog
					isOpen={destinationDialogState !== null}
					onClose={() => {
						destinationDialogState?.resolve(null);
						setDestinationDialogState(null);
					}}
					title={destinationDialogState?.title ?? "Choose Destination Provider"}
					description={
						destinationDialogState?.description ??
						"Select which provider root should receive these items."
					}
					providers={activeProviders}
					onSelectProvider={(providerId) => {
						destinationDialogState?.resolve(providerId);
						setDestinationDialogState(null);
					}}
				/>

				<FileDropZone isDragActive={isDragActive} />
			</div>

			<DragOverlay dropAnimation={null} modifiers={[snapToCursor]}>
				{dnd.activeDrag ? <DragOverlayContent item={dnd.activeDrag} /> : null}
			</DragOverlay>
		</DndContext>
	);
}
