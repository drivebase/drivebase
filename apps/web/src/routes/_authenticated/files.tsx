import { DndContext, DragOverlay } from "@dnd-kit/core";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
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
import { UploadProgressPanel } from "@/features/files/UploadProgressPanel";
import { UploadProviderDialog } from "@/features/files/UploadProviderDialog";
import { useFileActions } from "@/features/files/useFileActions";
import { useProviders } from "@/features/providers/hooks/useProviders";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";

const searchSchema = z.object({
	path: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/files")({
	validateSearch: (search) => searchSchema.parse(search),
	component: FilesPage,
});

function FilesPage() {
	const { path: searchPath } = Route.useSearch();
	const navigate = Route.useNavigate();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const { downloadFile, showDetails } = useFileActions();
	const { data: providersData } = useProviders();

	const currentPath = searchPath || "/";

	const [{ data: contentsData, fetching: contentsFetching }, refreshContents] =
		useContents(currentPath);

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

	const breadcrumbs = useBreadcrumbs(currentPath, currentFolder);

	const { isDragActive, dragHandlers } = useFileDrop({
		onDrop: upload.handleFilesSelected,
	});

	const dnd = useDragAndDrop({
		fileList,
		folderList,
		onMoveComplete: () => refreshContents({ requestPolicy: "network-only" }),
	});

	const handleNavigate = (folderId: string) => {
		const targetFolder = folders.find(
			(f: FolderItemFragment) => f.id === folderId,
		);
		if (targetFolder) {
			navigate({ search: { path: targetFolder.virtualPath } });
		}
	};

	const handleBreadcrumbClick = (path: string) => {
		navigate({ search: { path } });
	};

	return (
		<DndContext
			sensors={dnd.sensors}
			onDragStart={dnd.handleDragStart}
			onDragEnd={dnd.handleDragEnd}
			onDragCancel={dnd.handleDragCancel}
		>
			<div
				className="p-8 flex flex-col gap-6 h-full relative"
				{...dragHandlers}
			>
				<FilesToolbar
					currentPath={currentPath}
					breadcrumbs={breadcrumbs}
					isUploading={upload.isUploading}
					isLoading={contentsFetching}
					onBreadcrumbClick={handleBreadcrumbClick}
					onUploadClick={upload.handleUploadClick}
					onNewFolder={() => setIsCreateDialogOpen(true)}
					fileInputRef={upload.fileInputRef}
					onFileChange={upload.handleFileChange}
				/>

				<div className="flex-1 overflow-y-auto">
					<FileSystemTable
						files={files}
						folders={folders}
						providers={providersData?.storageProviders}
						onNavigate={handleNavigate}
						onDownloadFile={downloadFile}
						onShowFileDetails={showDetails}
						onToggleFileFavorite={operations.handleToggleFileFavorite}
						onToggleFolderFavorite={operations.handleToggleFolderFavorite}
						onRenameFile={operations.handleRenameFile}
						onRenameFolder={operations.handleRenameFolder}
						onMoveFileToProvider={operations.handleMoveFileToProvider}
						onDeleteSelection={operations.handleDeleteSelection}
						isLoading={contentsFetching && !contentsData}
						showSharedColumn
					/>
				</div>

				<CreateFolderDialog
					isOpen={isCreateDialogOpen}
					onClose={() => setIsCreateDialogOpen(false)}
					parentId={currentFolder?.id}
				/>

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

				<FileDropZone isDragActive={isDragActive} />

				<UploadProgressPanel
					items={upload.uploadQueue}
					onClose={upload.clearUploadQueue}
				/>
			</div>

			<DragOverlay dropAnimation={null}>
				{dnd.activeDrag ? <DragOverlayContent item={dnd.activeDrag} /> : null}
			</DragOverlay>
		</DndContext>
	);
}
