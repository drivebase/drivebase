import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTable } from "@/features/files/FileTable";
import { FolderCard } from "@/features/files/FolderCard";
import { useFileActions } from "@/features/files/useFileActions";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { useFiles, useStarFile, useUnstarFile } from "@/hooks/useFiles";
import { useStarredFolders } from "@/hooks/useFolders";

export function DashboardPage() {
	const { data: starredData, fetching: starredFetching } = useStarredFolders();
	const { data: filesData, fetching: filesFetching } = useFiles(null, 10); // Fetch recent files (limit 10)
	const [, starFile] = useStarFile();
	const [, unstarFile] = useUnstarFile();
	const { downloadFile, showDetails } = useFileActions();
	const navigate = useNavigate();

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
					? `Removed ${file.name} from favorites`
					: `Added ${file.name} to favorites`,
			);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to update favorite status.";
			toast.error(message);
		}
	};

	const starredFolders = (starredData?.starredFolders ||
		[]) as FolderItemFragment[];
	// Flatten the files connection if it exists
	const recentFiles = (filesData?.files?.files || []) as FileItemFragment[];

	return (
		<div className="p-8 flex flex-col gap-10 h-full overflow-y-auto">
			{(starredFetching || starredFolders.length > 0) && (
				<section>
					<div className="flex justify-between items-center mb-6">
						<h3 className="text-xl font-bold text-foreground">
							Starred Folders
						</h3>
						<button
							type="button"
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowRight size={20} />
						</button>
					</div>
					{starredFetching ? (
						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
							{Array.from({ length: 5 }).map((_, idx) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading
									key={idx}
									className="rounded-2xl bg-muted/50 p-4 space-y-4"
								>
									<Skeleton className="h-10 w-10 rounded-xl" />
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-3 w-16" />
								</div>
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
							{starredFolders.map((folder) => (
								<FolderCard
									key={folder.id}
									folder={folder}
									onClick={() =>
										navigate({
											to: "/files",
											search: { path: folder.virtualPath },
										})
									}
								/>
							))}
						</div>
					)}
				</section>
			)}

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
