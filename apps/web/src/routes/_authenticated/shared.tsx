import { createFileRoute } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { FileSystemTable } from "@/features/files/FileSystemTable";
import { useFileActions } from "@/features/files/useFileActions";
import { useFileOperations } from "@/features/files/hooks/useFileOperations";
import { useSharedWithMe } from "@/features/sharing";
import type { FolderItemFragment } from "@/gql/graphql";

export const Route = createFileRoute("/_authenticated/shared")({
	component: SharedWithMePage,
});

function SharedWithMePage() {
	const navigate = Route.useNavigate();
	const { downloadFile, showDetails } = useFileActions();

	const [{ data: sharedData, fetching }, refreshShared] = useSharedWithMe();

	const sharedFolders = (sharedData?.sharedWithMe ?? []) as FolderItemFragment[];

	const { folders, ...operations } = useFileOperations({
		serverFiles: undefined,
		serverFolders: sharedFolders,
		onMutationComplete: () => refreshShared({ requestPolicy: "network-only" }),
	});

	const handleNavigate = (folderId: string) => {
		// Navigate to the files page with the shared folder path
		const targetFolder = folders.find((f: FolderItemFragment) => f.id === folderId);
		if (targetFolder) {
			navigate({ to: "/files", search: { path: targetFolder.virtualPath } });
		}
	};

	return (
		<div className="p-8 flex flex-col gap-6 h-full">
			<div className="flex items-center gap-3">
				<Share2 className="h-6 w-6 text-muted-foreground" />
				<div>
					<h1 className="text-2xl font-semibold">Shared with me</h1>
					<p className="text-sm text-muted-foreground">
						Folders that others have shared with you
					</p>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{fetching && !sharedData ? (
					<div className="flex items-center justify-center h-64">
						<p className="text-muted-foreground">Loading...</p>
					</div>
				) : folders.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-64 gap-4">
						<Share2 className="h-16 w-16 text-muted-foreground/50" />
						<div className="text-center">
							<h3 className="text-lg font-medium mb-1">No shared folders</h3>
							<p className="text-sm text-muted-foreground">
								When others share folders with you, they'll appear here
							</p>
						</div>
					</div>
				) : (
					<FileSystemTable
						files={[]}
						folders={folders}
						providers={[]}
						onNavigate={handleNavigate}
						onDownloadFile={downloadFile}
						onShowFileDetails={showDetails}
						onToggleFolderFavorite={operations.handleToggleFolderFavorite}
						onRenameFolder={operations.handleRenameFolder}
						onDeleteSelection={operations.handleDeleteSelection}
						isLoading={fetching}
						showSharedColumn
					/>
				)}
			</div>
		</div>
	);
}
