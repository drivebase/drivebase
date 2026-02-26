import { DndContext, DragOverlay } from "@dnd-kit/core";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuthStore } from "@/features/auth/store/authStore";
import { CreateFolderDialog } from "@/features/files/CreateFolderDialog";
import { FileDropZone } from "@/features/files/components/FileDropZone";
import { FilesToolbar } from "@/features/files/components/FilesToolbar";
import {
	DragOverlayContent,
	FileSystemTable,
} from "@/features/files/FileSystemTable";
import { useBreadcrumbs } from "@/features/files/hooks/useBreadcrumbs";
import { useDragAndDrop } from "@/features/files/hooks/useDragAndDrop";
import { useFileDrop } from "@/features/files/hooks/useFileDrop";
import { useFileOperations } from "@/features/files/hooks/useFileOperations";
import { useContents } from "@/features/files/hooks/useFiles";
import { useUpload } from "@/features/files/hooks/useUpload";
import { useUploadSessionRestore } from "@/features/files/hooks/useUploadSessionRestore";
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
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";

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
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isFilesSettingsOpen, setIsFilesSettingsOpen] = useState(false);
	const [filterProviderIds, setFilterProviderIds] = useState<string[]>([]);
	const { downloadFile, showDetails, createDownloadLink } = useFileActions();
	const { data: providersData } = useProviders();
	const [workspacesResult, reexecuteWorkspaces] = useWorkspaces(false);
	const currentUserId = useAuthStore((state) => state.user?.id ?? null);
	const activeWorkspaceId = getActiveWorkspaceId() ?? "";
	const [membersResult] = useWorkspaceMembers(
		activeWorkspaceId,
		!activeWorkspaceId,
	);
	const currentWorkspaceRole =
		membersResult.data?.workspaceMembers.find(
			(member) => member.userId === currentUserId,
		)?.role ?? null;
	const canWriteFiles = can(currentWorkspaceRole, "files.write");
	const canManageSettings =
		currentWorkspaceRole === "OWNER" || currentWorkspaceRole === "ADMIN";
	const [updateSyncResult, updateWorkspaceSyncOperations] =
		useUpdateWorkspaceSyncOperations();

	const isRoot = !folderId;

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

	// Restore active upload sessions on page load
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

	const handleNavigate = (targetFolderId: string) => {
		navigate({ search: { folderId: targetFolderId } });
	};

	const handleBreadcrumbClick = (targetFolderId: string | null) => {
		navigate({ search: { folderId: targetFolderId ?? undefined } });
	};

	const activeWorkspace =
		workspacesResult.data?.workspaces?.find(
			(w) => w.id === activeWorkspaceId,
		) ??
		workspacesResult.data?.workspaces?.[0] ??
		null;

	const handleUpdateSync = async (enabled: boolean) => {
		if (!activeWorkspace?.id || !canManageSettings) {
			return;
		}

		const result = await updateWorkspaceSyncOperations({
			input: {
				workspaceId: activeWorkspace.id,
				enabled,
			},
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
			onDragStart={dnd.handleDragStart}
			onDragEnd={dnd.handleDragEnd}
			onDragCancel={dnd.handleDragCancel}
		>
			<div
				className="px-8 flex flex-col gap-6 h-full relative"
				{...dragHandlers}
			>
				<FilesToolbar
					isRoot={isRoot}
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
					onUploadClick={() => {
						if (!canWriteFiles) {
							return;
						}
						upload.handleUploadClick();
					}}
					onNewFolder={() => {
						if (!canWriteFiles) {
							return;
						}
						setIsCreateDialogOpen(true);
					}}
					onOpenSettings={() => setIsFilesSettingsOpen(true)}
					canManageSettings={canManageSettings}
					fileInputRef={upload.fileInputRef}
					onFileChange={upload.handleFileChange}
				/>

				<div className="flex-1 overflow-y-auto pb-8">
					<FileSystemTable
						files={files}
						folders={folders}
						providers={providersData?.storageProviders}
						onNavigate={handleNavigate}
						onDownloadFile={downloadFile}
						onCreateDownloadLink={
							canWriteFiles ? createDownloadLink : undefined
						}
						onShowFileDetails={showDetails}
						onToggleFileFavorite={
							canWriteFiles ? operations.handleToggleFileFavorite : undefined
						}
						onToggleFolderFavorite={
							canWriteFiles ? operations.handleToggleFolderFavorite : undefined
						}
						onRenameFile={
							canWriteFiles ? operations.handleRenameFile : undefined
						}
						onRenameFolder={
							canWriteFiles ? operations.handleRenameFolder : undefined
						}
						onMoveFileToProvider={
							canWriteFiles ? operations.handleMoveFileToProvider : undefined
						}
						onDeleteSelection={
							canWriteFiles ? operations.handleDeleteSelection : undefined
						}
						isLoading={contentsFetching}
						showSharedColumn
					/>
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

			<DragOverlay dropAnimation={null}>
				{dnd.activeDrag ? <DragOverlayContent item={dnd.activeDrag} /> : null}
			</DragOverlay>
		</DndContext>
	);
}
