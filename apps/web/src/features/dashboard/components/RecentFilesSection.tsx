import { Trans } from "@lingui/react/macro";
import { ArrowRight } from "@/shared/components/icons/solar";
import { FileTable } from "@/features/files/FileTable";
import type { FileItemFragment } from "@/gql/graphql";

export interface RecentFilesSectionProps {
	files: FileItemFragment[];
	isLoading: boolean;
	onOpenAllFiles: () => void;
	onDownloadFile: (file: FileItemFragment) => void;
	onShowFileDetails: (file: FileItemFragment) => void;
	onToggleFileFavorite: (file: FileItemFragment) => Promise<void>;
}

export function RecentFilesSection({
	files,
	isLoading,
	onOpenAllFiles,
	onDownloadFile,
	onShowFileDetails,
	onToggleFileFavorite,
}: RecentFilesSectionProps) {
	return (
		<section>
			<div className="flex justify-between items-center mb-6">
				<h3 className="text-xl font-bold text-foreground">
					<Trans>Recent Files</Trans>
				</h3>
				<button
					type="button"
					className="text-muted-foreground hover:text-foreground transition-colors"
					onClick={onOpenAllFiles}
				>
					<ArrowRight size={20} />
				</button>
			</div>
			<FileTable
				files={files}
				isLoading={isLoading}
				onDownloadFile={onDownloadFile}
				onShowFileDetails={onShowFileDetails}
				onToggleFileFavorite={onToggleFileFavorite}
			/>
		</section>
	);
}
