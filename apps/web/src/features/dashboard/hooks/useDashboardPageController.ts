import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useDashboardStats } from "@/features/dashboard/hooks/useDashboardStats";
import {
	useFiles,
	useStarFile,
	useUnstarFile,
} from "@/features/files/hooks/useFiles";
import { useStarredFolders } from "@/features/files/hooks/useFolders";
import { useFileActions } from "@/features/files/useFileActions";
import { getActiveWorkspaceId, useWorkspaces } from "@/features/workspaces";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";

export function useDashboardPageController() {
	const { i18n } = useLingui();
	const [workspacesResult] = useWorkspaces(false);
	const activeWorkspaceId = getActiveWorkspaceId() ?? "";
	const activeWorkspace =
		workspacesResult.data?.workspaces?.find(
			(workspace) => workspace.id === activeWorkspaceId,
		) ?? workspacesResult.data?.workspaces?.[0];
	const workspaceId = activeWorkspace?.id ?? "";

	const [statsResult] = useDashboardStats(workspaceId, !workspaceId);
	const { data: starredData, fetching: starredFetching } = useStarredFolders();
	const { data: filesData, fetching: filesFetching } = useFiles(null, 10);
	const [, starFile] = useStarFile();
	const [, unstarFile] = useUnstarFile();
	const { downloadFile, showDetails } = useFileActions();
	const navigate = useNavigate();

	const stats = statsResult.data?.workspaceStats ?? null;
	const starredFolders = (starredData?.starredFolders ||
		[]) as FolderItemFragment[];
	const recentFiles = (filesData?.files?.files || []) as FileItemFragment[];

	const handleToggleFileFavorite = async (file: FileItemFragment) => {
		try {
			const result = file.starred
				? await unstarFile({ id: file.id })
				: await starFile({ id: file.id });

			if (result.error) {
				throw new Error(result.error.message);
			}

			toast.success(
				file.starred
					? i18n._(msg`Removed ${file.name} from starred`)
					: i18n._(msg`Added ${file.name} to starred`),
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: i18n._(msg`Failed to update starred status.`),
			);
		}
	};

	const handleStarredFolderClick = (folderId: string) => {
		navigate({
			to: "/files",
			search: { folderId },
		});
	};

	const handleOpenAllFiles = () => {
		navigate({ to: "/files" });
	};

	return {
		stats,
		statsFetching: statsResult.fetching,
		starredFolders,
		starredFetching,
		recentFiles,
		filesFetching,
		downloadFile,
		showDetails,
		handleToggleFileFavorite,
		handleStarredFolderClick,
		handleOpenAllFiles,
	};
}
