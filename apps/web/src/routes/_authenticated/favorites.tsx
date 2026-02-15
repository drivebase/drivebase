import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { FileSystemTable } from "@/features/files/FileSystemTable";
import {
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
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { useOptimisticList } from "@/shared/hooks/useOptimisticList";

export const Route = createFileRoute("/_authenticated/favorites")({
	component: FavoritesPage,
});

function FavoritesPage() {
	const navigate = useNavigate();
	const { downloadFile, showDetails } = useFileActions();

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
					onToggleFileFavorite={handleToggleFileFavorite}
					onToggleFolderFavorite={handleToggleFolderFavorite}
					showSharedColumn
					emptyStateMessage="No favorites yet"
				/>
			</section>
		</div>
	);
}
