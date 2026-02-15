import { toast } from "sonner";
import {
	useDeleteFile,
	useRenameFile,
	useStarFile,
	useUnstarFile,
} from "@/features/files/hooks/useFiles";
import {
	useDeleteFolder,
	useRenameFolder,
	useStarFolder,
	useUnstarFolder,
} from "@/features/files/hooks/useFolders";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { useOptimisticList } from "@/shared/hooks/useOptimisticList";
import { promptDialog } from "@/shared/lib/promptDialog";

interface UseFileOperationsOptions {
	serverFiles: FileItemFragment[] | undefined;
	serverFolders: FolderItemFragment[] | undefined;
	onMutationComplete?: () => void;
}

export function useFileOperations({
	serverFiles,
	serverFolders,
	onMutationComplete,
}: UseFileOperationsOptions) {
	const fileList = useOptimisticList<FileItemFragment>(serverFiles);
	const folderList = useOptimisticList<FolderItemFragment>(serverFolders);

	const [, deleteFile] = useDeleteFile();
	const [, deleteFolder] = useDeleteFolder();
	const [, renameFile] = useRenameFile();
	const [, renameFolder] = useRenameFolder();
	const [, starFile] = useStarFile();
	const [, unstarFile] = useUnstarFile();
	const [, starFolder] = useStarFolder();
	const [, unstarFolder] = useUnstarFolder();

	const handleToggleFileFavorite = async (file: FileItemFragment) => {
		const currentStarred =
			fileList.items.find((f) => f.id === file.id)?.starred ?? file.starred;
		fileList.updateItem(file.id, { starred: !currentStarred });

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
			fileList.resetItem(file.id);
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
		folderList.updateItem(folder.id, { starred: !currentStarred });

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
			folderList.resetItem(folder.id);
			const message =
				error instanceof Error
					? error.message
					: "Failed to update favorite status.";
			toast.error(message);
		}
	};

	const handleRenameFile = async (file: FileItemFragment) => {
		const newName = await promptDialog("Rename File", `Rename "${file.name}"`, {
			defaultValue: file.name,
			placeholder: "Enter new name",
			submitLabel: "Rename",
		});
		if (!newName || newName === file.name) return;

		fileList.updateItem(file.id, { name: newName });

		const result = await renameFile({ id: file.id, name: newName });
		if (result.error) {
			fileList.resetItem(file.id);
			toast.error(`Failed to rename: ${result.error.message}`);
		} else {
			if (result.data?.renameFile) {
				fileList.updateItem(file.id, result.data.renameFile);
			}
			toast.success(`Renamed to "${newName}"`);
		}
	};

	const handleRenameFolder = async (folder: FolderItemFragment) => {
		const newName = await promptDialog(
			"Rename Folder",
			`Rename "${folder.name}"`,
			{
				defaultValue: folder.name,
				placeholder: "Enter new name",
				submitLabel: "Rename",
			},
		);
		if (!newName || newName === folder.name) return;

		folderList.updateItem(folder.id, { name: newName });

		const result = await renameFolder({ id: folder.id, name: newName });
		if (result.error) {
			folderList.resetItem(folder.id);
			toast.error(`Failed to rename: ${result.error.message}`);
		} else {
			// Update with server response to get the new virtualPath
			if (result.data?.renameFolder) {
				folderList.updateItem(folder.id, result.data.renameFolder);
			}
			toast.success(`Renamed to "${newName}"`);
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

		fileList.setItems((prev) =>
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

		folderList.setItems((prev) =>
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
			onMutationComplete?.();
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

	return {
		files: fileList.items,
		folders: folderList.items,
		fileList,
		folderList,
		handleToggleFileFavorite,
		handleToggleFolderFavorite,
		handleRenameFile,
		handleRenameFolder,
		handleDeleteSelection,
	};
}
