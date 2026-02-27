import { useNavigate } from "@tanstack/react-router";
import { useDownload } from "@/features/files/hooks/useDownload";
import {
	useDeleteFile,
	useStarFile,
	useUnstarFile,
} from "@/features/files/hooks/useFiles";
import { useFileDetailsDialogStore } from "@/features/files/store/fileDetailsDialogStore";
import type { FileItemFragment } from "@/gql/graphql";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import type { NavigationItem } from "./constants";

type Params = {
	selectedFile: FileItemFragment | null;
	setSelectedFile: (file: FileItemFragment | null) => void;
	setDeletedFileIds: (updater: (prev: Set<string>) => Set<string>) => void;
	setOpen: (open: boolean) => void;
};

export function usePaletteActions({
	selectedFile,
	setSelectedFile,
	setDeletedFileIds,
	setOpen,
}: Params) {
	const navigate = useNavigate();
	const { downloadFile } = useDownload();
	const [, deleteFile] = useDeleteFile();
	const [, starFile] = useStarFile();
	const [, unstarFile] = useUnstarFile();
	const openForFile = useFileDetailsDialogStore((state) => state.openForFile);

	const openFile = (file: FileItemFragment) => {
		navigate({
			to: "/files",
			search: { folderId: file.folderId ?? undefined },
		});
		openForFile(file.id);
		setOpen(false);
	};

	const openFolder = (folderId: string) => {
		navigate({
			to: "/files",
			search: { folderId },
		});
		setOpen(false);
	};

	const navigateTo = (to: NavigationItem["to"]) => {
		navigate({ to });
		setOpen(false);
	};

	const handleDeleteFile = async (file: FileItemFragment) => {
		const confirmed = await confirmDialog(
			"Delete File",
			`Delete "${file.name}"? This action cannot be undone.`,
		);
		if (!confirmed) return;

		const result = await deleteFile({ id: file.id });
		if (result.error) return;

		setDeletedFileIds((prev) => new Set([...prev, file.id]));
		if (selectedFile?.id === file.id) {
			setSelectedFile(null);
		}
		setOpen(false);
	};

	const handleToggleStar = async (file: FileItemFragment) => {
		if (file.starred) {
			const result = await unstarFile({ id: file.id });
			if (result.data?.unstarFile) {
				setSelectedFile(result.data.unstarFile as FileItemFragment);
			}
			return;
		}

		const result = await starFile({ id: file.id });
		if (result.data?.starFile) {
			setSelectedFile(result.data.starFile as FileItemFragment);
		}
	};

	const handleDownloadFile = async (file: FileItemFragment) => {
		await downloadFile(file);
		setOpen(false);
	};

	return {
		navigateTo,
		openFolder,
		openFile,
		handleDeleteFile,
		handleToggleStar,
		handleDownloadFile,
	};
}
