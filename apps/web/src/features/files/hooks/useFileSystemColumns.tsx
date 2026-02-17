import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { FolderIcon } from "lucide-react";
import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FileMimeIcon } from "@/features/files/FileMimeIcon";
import {
	formatFileTypeLabel,
	formatProviderTypeLabel,
	formatSize,
} from "@/features/files/utils";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import { FileSystemRowActions } from "../components/file-system-table/FileSystemRowActions";
import type {
	FileSystemTableHandlers,
	ProviderInfo,
	RowItem,
} from "../components/file-system-table/types";

interface UseFileSystemColumnsOptions extends FileSystemTableHandlers {
	providers?: ProviderInfo[];
}

export function useFileSystemColumns({
	providers = [],
	onNavigate,
	onDownloadFile,
	onShowFileDetails,
	onToggleFileFavorite,
	onToggleFolderFavorite,
	onRenameFile,
	onRenameFolder,
	onMoveFileToProvider,
	onDeleteSelection,
	onShareFolder,
}: UseFileSystemColumnsOptions): ColumnDef<RowItem>[] {
	return useMemo<ColumnDef<RowItem>[]>(
		() => [
			{
				id: "select",
				enableHiding: false,
				size: 44,
				minSize: 44,
				maxSize: 44,
				header: ({ table }) => (
					<div className="w-4 h-4 flex items-center justify-center">
						<Checkbox
							aria-label="Select all"
							className="w-4 h-4 min-w-4 min-h-4 shrink-0"
							checked={
								table.getIsAllPageRowsSelected()
									? true
									: table.getIsSomePageRowsSelected()
										? "indeterminate"
										: false
							}
							onCheckedChange={(value) =>
								table.toggleAllPageRowsSelected(value === true)
							}
						/>
					</div>
				),
				cell: ({ row }) => (
					<div className="w-4 h-4 flex items-center justify-center">
						<Checkbox
							aria-label="Select row"
							className="w-4 h-4 min-w-4 min-h-4 shrink-0"
							checked={row.getIsSelected()}
							onCheckedChange={(value) => row.toggleSelected(value === true)}
						/>
					</div>
				),
			},
			{
				id: "name",
				size: 360,
				minSize: 260,
				accessorFn: (row) =>
					row.kind === "file" ? row.file.name : row.folder.name,
				header: "Name",
				cell: ({ row }) => {
					if (row.original.kind === "folder") {
						const folder = row.original.folder;
						return (
							<button
								type="button"
								onClick={() => onNavigate?.(folder.id)}
								className="font-medium flex items-center gap-3 text-left hover:underline min-w-0"
							>
								<div className="w-8 h-8 shrink-0 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
									<FolderIcon size={16} />
								</div>
								<span className="truncate">{folder.name}</span>
							</button>
						);
					}

					const file = row.original.file;
					return (
						<div className="font-medium flex items-center gap-3 min-w-0">
							<div className="shrink-0">
								<FileMimeIcon mimeType={file.mimeType} />
							</div>
							<span className="truncate">{file.name}</span>
						</div>
					);
				},
			},
			{
				id: "size",
				size: 120,
				minSize: 100,
				header: "Size",
				accessorFn: (row) => (row.kind === "file" ? row.file.size : null),
				cell: ({ row }) =>
					row.original.kind === "file"
						? formatSize(row.original.file.size)
						: "-",
			},
			{
				id: "provider",
				size: 150,
				minSize: 120,
				header: "Provider",
				accessorFn: (row) =>
					row.kind === "file"
						? (row.file.provider?.type ?? "Unknown")
						: "Folder",
				cell: ({ row }) => {
					if (row.original.kind === "folder") return "-";
					const file = row.original.file;
					return (
						<div className="flex items-center gap-2">
							<ProviderIcon
								type={file.provider?.type ?? "unknown"}
								className="h-4 w-4"
							/>
							<span className="text-sm text-muted-foreground">
								{formatProviderTypeLabel(file.provider?.type)}
							</span>
						</div>
					);
				},
			},
			{
				id: "type",
				size: 60,
				minSize: 80,
				header: "Type",
				accessorFn: (row) =>
					row.kind === "file" ? row.file.mimeType : "folder",
				cell: ({ row }) =>
					row.original.kind === "file"
						? formatFileTypeLabel(row.original.file.mimeType)
						: "Folder",
			},
			{
				id: "shared",
				size: 20,
				minSize: 20,
				header: "Shared",
				enableHiding: true,
				cell: () => (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
						Private
					</span>
				),
			},
			{
				id: "updatedAt",
				size: 170,
				minSize: 150,
				header: () => <div className="text-right">Last Modified</div>,
				accessorFn: (row) =>
					row.kind === "file" ? row.file.updatedAt : row.folder.updatedAt,
				cell: ({ row }) => {
					const date =
						row.original.kind === "file"
							? row.original.file.updatedAt
							: row.original.folder.updatedAt;
					return (
						<div className="text-right text-muted-foreground">
							{format(new Date(date), "MMM dd, yyyy")}
						</div>
					);
				},
			},
			{
				id: "actions",
				enableHiding: false,
				size: 44,
				minSize: 44,
				maxSize: 44,
				header: () => <div className="text-right" />,
				cell: ({ row }) => {
					const original = row.original;
					const file = original.kind === "file" ? original.file : undefined;
					const folder =
						original.kind === "folder" ? original.folder : undefined;

					return (
						<FileSystemRowActions
							file={file}
							folder={folder}
							providers={providers}
							onDownloadFile={onDownloadFile}
							onShowFileDetails={onShowFileDetails}
							onRenameFile={onRenameFile}
							onRenameFolder={onRenameFolder}
							onToggleFileFavorite={onToggleFileFavorite}
							onToggleFolderFavorite={onToggleFolderFavorite}
							onMoveFileToProvider={onMoveFileToProvider}
							onDeleteSelection={onDeleteSelection}
							onShareFolder={onShareFolder}
						/>
					);
				},
			},
		],
		[
			onDeleteSelection,
			onDownloadFile,
			onMoveFileToProvider,
			onNavigate,
			onRenameFile,
			onRenameFolder,
			onShowFileDetails,
			onToggleFileFavorite,
			onToggleFolderFavorite,
			onShareFolder,
			providers,
		],
	);
}
