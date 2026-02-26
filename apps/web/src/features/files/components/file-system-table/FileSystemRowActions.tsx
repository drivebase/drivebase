import { Trans } from "@lingui/react/macro";
import {
	Download,
	Eye,
	Info,
	MoreHorizontal,
	Move,
	Pencil,
	Share2,
	Star,
	Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import type { FileSystemTableHandlers, ProviderInfo } from "./types";

interface FileSystemRowActionsProps extends FileSystemTableHandlers {
	file?: FileItemFragment;
	folder?: FolderItemFragment;
	providers?: ProviderInfo[];
}

export function FileSystemRowActions({
	file,
	folder,
	providers = [],
	onDownloadFile,
	onCreateDownloadLink,
	onShowFileDetails,
	onRenameFile,
	onRenameFolder,
	onToggleFileFavorite,
	onToggleFolderFavorite,
	onMoveFileToProvider,
	onDeleteSelection,
}: FileSystemRowActionsProps) {
	const canRename = file ? !!onRenameFile : !!onRenameFolder;
	const canMove = !!file && !!onMoveFileToProvider;
	const canCreateDownloadLink = !!file && !!onCreateDownloadLink;
	const canToggleFavorite = file
		? !!onToggleFileFavorite
		: !!onToggleFolderFavorite;
	const canShowDetails = !!file && !!onShowFileDetails;
	const canDelete = !!onDeleteSelection;

	const handleDelete = async () => {
		if (!canDelete) {
			return;
		}
		const confirmed = await confirmDialog(
			"Delete Item",
			"This action cannot be undone.",
		);
		if (!confirmed) return;
		onDeleteSelection?.({
			files: file ? [file] : [],
			folders: folder ? [folder] : [],
		});
	};

	return (
		<div className="flex justify-end">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-48">
					{file ? (
						<>
							<DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => onDownloadFile?.(file)}>
								<Download size={14} className="mr-2" /> Download
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Eye size={14} className="mr-2" /> Preview
							</DropdownMenuItem>
							<DropdownMenuSeparator />
						</>
					) : null}
					{canRename || canMove ? (
						<>
							<DropdownMenuLabel>Organize</DropdownMenuLabel>
							{canRename ? (
								<DropdownMenuItem
									onClick={() => {
										if (file) onRenameFile?.(file);
										if (folder) onRenameFolder?.(folder);
									}}
								>
									<Pencil size={14} className="mr-2" /> Rename
								</DropdownMenuItem>
							) : null}
						</>
					) : null}
					{canMove && file && providers.length > 0 ? (
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<Move size={14} className="mr-2" /> Move to
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{providers
									.filter((p) => p.id !== file.provider?.id)
									.map((provider) => (
										<DropdownMenuItem
											key={provider.id}
											onClick={() => onMoveFileToProvider?.(file, provider.id)}
										>
											<ProviderIcon
												type={provider.type}
												className="h-4 w-4 mr-2"
											/>
											{provider.name}
										</DropdownMenuItem>
									))}
								{providers.filter((p) => p.id !== file.provider?.id).length ===
								0 ? (
									<DropdownMenuItem disabled>
										No other providers
									</DropdownMenuItem>
								) : null}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					) : null}
					{canRename || canMove ? <DropdownMenuSeparator /> : null}
					<DropdownMenuLabel>Library</DropdownMenuLabel>
					<DropdownMenuItem
						disabled={!canCreateDownloadLink}
						onClick={() => file && onCreateDownloadLink?.(file)}
					>
						<Share2 size={14} className="mr-2" />{" "}
						<Trans>Create download link</Trans>
					</DropdownMenuItem>
					{file && canToggleFavorite ? (
						<DropdownMenuItem onClick={() => onToggleFileFavorite?.(file)}>
							<Star size={14} className="mr-2" />
							{file.starred ? "Remove from Starred" : "Add to Starred"}
						</DropdownMenuItem>
					) : null}
					{folder && canToggleFavorite ? (
						<DropdownMenuItem onClick={() => onToggleFolderFavorite?.(folder)}>
							<Star size={14} className="mr-2" />
							{folder.starred ? "Remove from Starred" : "Add to Starred"}
						</DropdownMenuItem>
					) : null}
					{canShowDetails ? (
						<DropdownMenuItem onClick={() => file && onShowFileDetails?.(file)}>
							<Info size={14} className="mr-2" /> Details
						</DropdownMenuItem>
					) : null}
					{canDelete ? <DropdownMenuSeparator /> : null}
					{canDelete ? (
						<DropdownMenuItem variant="destructive" onClick={handleDelete}>
							<Trash size={14} className="mr-2" /> Delete
						</DropdownMenuItem>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
