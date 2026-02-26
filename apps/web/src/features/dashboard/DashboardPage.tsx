import { DashboardStatsSection } from "@/features/dashboard/components/DashboardStatsSection";
import { RecentFilesSection } from "@/features/dashboard/components/RecentFilesSection";
import { StarredFoldersSection } from "@/features/dashboard/components/StarredFoldersSection";
import { useDashboardPageController } from "@/features/dashboard/hooks/useDashboardPageController";

export function DashboardPage() {
	const {
		stats,
		statsFetching,
		starredFolders,
		starredFetching,
		recentFiles,
		filesFetching,
		downloadFile,
		showDetails,
		handleToggleFileFavorite,
		handleStarredFolderClick,
		handleOpenAllFiles,
	} = useDashboardPageController();

	return (
		<div className="px-8 pb-8 flex flex-col gap-10 h-full overflow-y-auto">
			<DashboardStatsSection stats={stats} isLoading={statsFetching} />
			<StarredFoldersSection
				folders={starredFolders}
				isLoading={starredFetching}
				onFolderClick={handleStarredFolderClick}
			/>
			<RecentFilesSection
				files={recentFiles}
				isLoading={filesFetching}
				onOpenAllFiles={handleOpenAllFiles}
				onDownloadFile={downloadFile}
				onShowFileDetails={showDetails}
				onToggleFileFavorite={handleToggleFileFavorite}
			/>
		</div>
	);
}
