import { useNavigate } from "@tanstack/react-router";
import { formatBytes } from "@drivebase/utils";
import { Activity, ArrowRight, Files, HardDrive, Server } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/features/dashboard/hooks/useDashboardStats";
import { FileTable } from "@/features/files/FileTable";
import { FolderCard } from "@/features/files/FolderCard";
import {
	useFiles,
	useStarFile,
	useUnstarFile,
} from "@/features/files/hooks/useFiles";
import { useStarredFolders } from "@/features/files/hooks/useFolders";
import { useFileActions } from "@/features/files/useFileActions";
import { getActiveWorkspaceId, useWorkspaces } from "@/features/workspaces";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";

export function DashboardPage() {
	const [workspacesResult] = useWorkspaces(false);
	const activeWorkspaceId = getActiveWorkspaceId() ?? "";
	const activeWorkspace =
		workspacesResult.data?.workspaces?.find(
			(workspace) => workspace.id === activeWorkspaceId,
		) ?? workspacesResult.data?.workspaces?.[0];
	const workspaceId = activeWorkspace?.id ?? "";
	const [statsResult] = useDashboardStats(workspaceId, !workspaceId);
	const { data: starredData, fetching: starredFetching } = useStarredFolders();
	const { data: filesData, fetching: filesFetching } = useFiles(null, 10); // Fetch recent files (limit 10)
	const [, starFile] = useStarFile();
	const [, unstarFile] = useUnstarFile();
	const { downloadFile, showDetails } = useFileActions();
	const navigate = useNavigate();
	const stats = statsResult.data?.workspaceStats;
	const statCards = [
		{
			id: "total-files",
			title: "Total Files",
			value: stats ? stats.totalFiles.toLocaleString() : "0",
			icon: Files,
			iconClassName: "bg-cyan-500/15 text-cyan-700",
		},
		{
			id: "total-size",
			title: "Total Size",
			value: stats ? formatBytes(stats.totalSizeBytes) : formatBytes(0),
			icon: HardDrive,
			iconClassName: "bg-emerald-500/15 text-emerald-700",
		},
		{
			id: "today-bandwidth",
			title: "Today Bandwidth",
			value: stats ? formatBytes(stats.bandwidthBytes) : formatBytes(0),
			icon: Activity,
			iconClassName: "bg-orange-500/15 text-orange-700",
		},
		{
			id: "total-providers",
			title: "Total Providers",
			value: stats ? stats.totalProviders.toLocaleString() : "0",
			icon: Server,
			iconClassName: "bg-violet-500/15 text-violet-700",
		},
	];

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
					? `Removed ${file.name} from starred`
					: `Added ${file.name} to starred`,
			);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to update starred status.";
			toast.error(message);
		}
	};

	const starredFolders = (starredData?.starredFolders ||
		[]) as FolderItemFragment[];
	// Flatten the files connection if it exists
	const recentFiles = (filesData?.files?.files || []) as FileItemFragment[];

	return (
		<div className="px-8 pb-8 flex flex-col gap-10 h-full overflow-y-auto">
			<section>
				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
					{statsResult.fetching && !stats
						? Array.from({ length: 4 }).map((_, idx) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading
									key={idx}
									className="h-[136px] border p-5"
								>
									<div className="h-full flex flex-col justify-between">
										<div className="flex items-center gap-3">
											<Skeleton className="h-9 w-9" />
											<Skeleton className="h-3 w-24" />
										</div>
										<Skeleton className="h-10 w-32" />
									</div>
								</div>
							))
						: statCards.map((card) => {
								const Icon = card.icon;
								return (
									<div key={card.id} className="h-[136px] border p-5">
										<div className="h-full flex flex-col justify-between">
											<div className="flex items-center gap-3">
												<div
													className={`h-9 w-9 grid place-items-center ${card.iconClassName}`}
												>
													<Icon className="h-5 w-5" />
												</div>
												<p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
													{card.title}
												</p>
											</div>
											<p className="text-4xl leading-none font-bold text-foreground tabular-nums">
												{card.value}
											</p>
										</div>
									</div>
								);
							})}
				</div>
			</section>

			<section>
				<div className="flex justify-between items-center mb-6">
					<h3 className="text-xl font-bold text-foreground">Starred Folders</h3>
				</div>
				{starredFetching ? (
					<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
						{Array.from({ length: 5 }).map((_, idx) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading
								key={idx}
								className=" bg-muted/50 p-4 space-y-4"
							>
								<Skeleton className="h-10 w-10 " />
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-3 w-16" />
							</div>
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
						{starredFolders.length === 0 ? (
							<div className="col-span-full text-center text-muted-foreground h-60 flex items-center justify-center border border-dashed ">
								You haven't starred any folders yet.
							</div>
						) : (
							starredFolders.map((folder) => (
								<FolderCard
									key={folder.id}
									folder={folder}
									onClick={() =>
										navigate({
											to: "/files",
											search: { folderId: folder.id },
										})
									}
								/>
							))
						)}
					</div>
				)}
			</section>

			<section>
				<div className="flex justify-between items-center mb-6">
					<h3 className="text-xl font-bold text-foreground">Recent Files</h3>
					<button
						type="button"
						className="text-muted-foreground hover:text-foreground transition-colors"
						onClick={() => navigate({ to: "/files" })}
					>
						<ArrowRight size={20} />
					</button>
				</div>
				<FileTable
					files={recentFiles}
					isLoading={filesFetching}
					onDownloadFile={downloadFile}
					onShowFileDetails={showDetails}
					onToggleFileFavorite={handleToggleFileFavorite}
				/>
			</section>
		</div>
	);
}
