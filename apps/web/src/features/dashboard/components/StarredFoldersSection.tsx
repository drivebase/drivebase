import { Trans } from "@lingui/react/macro";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderCard } from "@/features/files/FolderCard";
import type { FolderItemFragment } from "@/gql/graphql";

export interface StarredFoldersSectionProps {
	folders: FolderItemFragment[];
	isLoading: boolean;
	onFolderClick: (folderId: string) => void;
}

export function StarredFoldersSection({
	folders,
	isLoading,
	onFolderClick,
}: StarredFoldersSectionProps) {
	return (
		<section>
			<div className="flex justify-between items-center mb-6">
				<h3 className="text-xl font-bold text-foreground">
					<Trans>Starred Folders</Trans>
				</h3>
			</div>
			{isLoading ? (
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
					{folders.length === 0 ? (
						<div className="col-span-full text-center text-muted-foreground h-60 flex items-center justify-center border border-dashed ">
							<Trans>You haven&apos;t starred any folders yet.</Trans>
						</div>
					) : (
						folders.map((folder) => (
							<FolderCard
								key={folder.id}
								folder={folder}
								onClick={() => onFolderClick(folder.id)}
							/>
						))
					)}
				</div>
			)}
		</section>
	);
}
