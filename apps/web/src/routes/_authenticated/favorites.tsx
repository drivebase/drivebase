import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store/authStore";
import { FileSystemTable } from "@/features/files/FileSystemTable";
import {
	useMoveFileToProvider,
	useStarFile,
	useStarredFiles,
	useUnstarFile,
} from "@/features/files/hooks/useFiles";
import {
	useStarFolder,
	useStarredFolders,
	useUnstarFolder,
} from "@/features/files/hooks/useFolders";
import { useFileActions } from "@/features/files/useFileActions";
import { useProviders } from "@/features/providers/hooks/useProviders";
import { can, getActiveWorkspaceId } from "@/features/workspaces";
import { useWorkspaceMembers } from "@/features/workspaces/hooks/useWorkspaces";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { useOptimisticList } from "@/shared/hooks/useOptimisticList";

export const Route = createFileRoute("/_authenticated/favorites")({
	component: FavoritesPage,
});

function FavoritesPage() {
	const navigate = useNavigate();
	const { downloadFile, showDetails } = useFileActions();
	const { data: providersData } = useProviders();
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

	const { data: starredFilesData, fetching: filesFetching } = useStarredFiles();
	const { data: starredFoldersData, fetching: foldersFetching } =
		useStarredFolders();

	const fileList = useOptimisticList<FileItemFragment>(
		starredFilesData?.starredFiles as FileItemFragment[] | undefined,
	);
	const folderList = useOptimisticList<FolderItemFragment>(
		starredFoldersData?.starredFolders as FolderItemFragment[] | undefined,
	);

	const [, starFile] = useStarFile();
	const [, unstarFile] = useUnstarFile();
	const [, starFolder] = useStarFolder();
	const [, unstarFolder] = useUnstarFolder();
	const [, moveFileToProvider] = useMoveFileToProvider();

	const handleMoveFileToProvider = async (
		file: FileItemFragment,
		providerId: string,
	) => {
		const result = await moveFileToProvider({ id: file.id, providerId });
		if (result.error) {
			toast.error(`Failed to move: ${result.error.message}`);
		} else {
			if (result.data?.moveFileToProvider) {
				fileList.updateItem(file.id, result.data.moveFileToProvider);
			}
			toast.success(`Moved "${file.name}" to new provider`);
		}
	};

	const handleToggleFileFavorite = async (file: FileItemFragment) => {
		const currentStarred =
			fileList.items.find((f) => f.id === file.id)?.starred ?? file.starred;

		if (currentStarred) {
			fileList.removeItem(file.id);
		}

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
			if (currentStarred) {
				fileList.resetItem(file.id);
			}
			const message =
				error instanceof Error
					? error.message
					: "Failed to update favorite status.";
			toast.error(message);
		}
	};

	const handleToggleFolderFavorite = async (folder: FolderItemFragment) => {
		const currentStarred =
			folderList.items.find((f) => f.id === folder.id)?.starred ??
			folder.starred;

		if (currentStarred) {
			folderList.removeItem(folder.id);
		}

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
			if (currentStarred) {
				folderList.resetItem(folder.id);
			}
			const message =
				error instanceof Error
					? error.message
					: "Failed to update favorite status.";
			toast.error(message);
		}
	};

	if (
		!filesFetching &&
		!foldersFetching &&
		folderList.items.length === 0 &&
		fileList.items.length === 0
	) {
		return (
			<div className="p-8 flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
				<Star size={64} className="opacity-20" />
				<h2 className="text-2xl font-bold">Favorites</h2>
				<p>No favorites yet. Star files or folders to see them here.</p>
			</div>
		);
	}

	return (
		<div className="p-8 flex flex-col gap-10 h-full overflow-y-auto">
			<section>
				<FileSystemTable
					files={fileList.items}
					folders={folderList.items}
					providers={providersData?.storageProviders}
					isLoading={filesFetching || foldersFetching}
					onNavigate={(folderId) => {
						const folder = folderList.items.find(
							(item) => item.id === folderId,
						);
						if (!folder) return;
						navigate({
							to: "/files",
							search: { path: folder.virtualPath },
						});
					}}
					onDownloadFile={downloadFile}
					onShowFileDetails={showDetails}
					onToggleFileFavorite={
						canWriteFiles ? handleToggleFileFavorite : undefined
					}
					onToggleFolderFavorite={
						canWriteFiles ? handleToggleFolderFavorite : undefined
					}
					onMoveFileToProvider={
						canWriteFiles ? handleMoveFileToProvider : undefined
					}
					showSharedColumn
					emptyStateMessage="No favorites yet"
				/>
			</section>
		</div>
	);
}
