import {
	DndContext,
	DragOverlay,
	type Modifier,
	pointerWithin,
} from "@dnd-kit/core";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useActions } from "@/features/files/actions/useActions";
import { CreateFolderDialog } from "@/features/files/CreateFolderDialog";
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
import { FilesSettingsDialog } from "@/features/files/settings/FilesSettingsDialog";
import { UploadProviderDialog } from "@/features/files/UploadProviderDialog";
import { useFileActions } from "@/features/files/useFileActions";
import { useProviders } from "@/features/providers/hooks/useProviders";
import {
	can,
	getActiveWorkspaceId,
	useUpdateWorkspaceSyncOperations,
	useWorkspaces,
} from "@/features/workspaces";
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
	const [isFilesSettingsOpen, setIsFilesSettingsOpen] = useState(false);
	const [filterProviderIds, setFilterProviderIds] = useState<string[]>([]);
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
	const [workspacesResult, reexecuteWorkspaces] = useWorkspaces(false);
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
	const canManageSettings =
		currentWorkspaceRole === "OWNER" || currentWorkspaceRole === "ADMIN";
	const [updateSyncResult, updateWorkspaceSyncOperations] =
		useUpdateWorkspaceSyncOperations();

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
		currentFolderId: currentFolder?.id,
		onUploadComplete: () => refreshContents({ requestPolicy: "network-only" }),
	});

	useUploadSessionRestore();

	const breadcrumbs = useBreadcrumbs(currentFolder);
	const { isDragActive, dragHandlers } = useFileDrop({
		onDrop: upload.handleFilesSelected,
	});

	const syncEnabledInWorkspace =
		(
			workspacesResult.data?.workspaces?.find(
				(w) => w.id === activeWorkspaceId,
			) ?? workspacesResult.data?.workspaces?.[0]
		)?.syncOperationsToProvider ?? false;

	const dnd = useDragAndDrop({
		fileList,
		folderList,
		syncEnabled: syncEnabledInWorkspace,
		onMoveComplete: () => refreshContents({ requestPolicy: "network-only" }),
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
			const result = await operations.handlePasteSelection(
				clipboardMode,
				targetFolderId,
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

	const activeWorkspace =
		workspacesResult.data?.workspaces?.find(
			(w) => w.id === activeWorkspaceId,
		) ??
		workspacesResult.data?.workspaces?.[0] ??
		null;

	const handleUpdateSync = async (enabled: boolean) => {
		if (!activeWorkspace?.id || !canManageSettings) return;
		const result = await updateWorkspaceSyncOperations({
			input: { workspaceId: activeWorkspace.id, enabled },
		});
		if (result.error || !result.data?.updateWorkspaceSyncOperations) {
			toast.error(
				result.error?.message ?? <Trans>Failed to update sync setting</Trans>,
			);
			return;
		}
		toast.success(
			enabled ? <Trans>Sync enabled</Trans> : <Trans>Sync disabled</Trans>,
		);
	};

	return (
		<DndContext
			sensors={dnd.sensors}
			collisionDetection={pointerWithin}
			onDragStart={dnd.handleDragStart}
			onDragEnd={dnd.handleDragEnd}
			onDragCancel={dnd.handleDragCancel}
		>
			<div
				className="pt-8 px-8 flex flex-col gap-6 h-full relative"
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
					onOpenSettings={() => setIsFilesSettingsOpen(true)}
					canManageSettings={canManageSettings}
					fileInputRef={upload.fileInputRef}
					onFileChange={upload.handleFileChange}
				/>

				<div ref={scrollRef} className="relative flex-1 overflow-y-auto">
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
						<div className="h-full min-h-[220px]">
							<FileExplorer />
						</div>
					</FileExplorerProvider>
					{isOverflowing && (
						<div className="pointer-events-none sticky bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
					)}
				</div>

				{canWriteFiles ? (
					<CreateFolderDialog
						isOpen={isCreateDialogOpen}
						onClose={() => setIsCreateDialogOpen(false)}
						parentId={currentFolder?.id}
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

				<FilesSettingsDialog
					isOpen={isFilesSettingsOpen}
					onClose={() => setIsFilesSettingsOpen(false)}
					syncEnabled={activeWorkspace?.syncOperationsToProvider ?? false}
					canManageSettings={canManageSettings}
					isSaving={updateSyncResult.fetching}
					onSyncToggle={async (enabled) => {
						await handleUpdateSync(enabled);
						reexecuteWorkspaces({ requestPolicy: "network-only" });
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
