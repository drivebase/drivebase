import { FolderPlus, Lock, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { UploadProgressPanel } from "@/features/files/UploadProgressPanel";
import { useProviders } from "@/features/providers/hooks/useProviders";
import { useCreateVaultFolder } from "@/features/vault/hooks/useVault";
import { useVaultFileActions } from "@/features/vault/hooks/useVaultFileActions";
import { useVaultUpload } from "@/features/vault/hooks/useVaultUpload";
import type { VaultContentsQuery } from "@/gql/graphql";

type VaultFile = NonNullable<
	VaultContentsQuery["vaultContents"]["files"]
>[number];
type VaultFolder = NonNullable<
	VaultContentsQuery["vaultContents"]["folders"]
>[number];

interface VaultFileBrowserProps {
	currentPath: string;
	contents: VaultContentsQuery["vaultContents"] | undefined;
	isFetching: boolean;
	onNavigate: (path: string) => void;
	onRefresh: () => void;
}

export function VaultFileBrowser({
	currentPath,
	contents,
	isFetching,
	onNavigate,
	onRefresh,
}: VaultFileBrowserProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);

	const { data: providersData } = useProviders();
	const [, createVaultFolder] = useCreateVaultFolder();
	const { downloadFile, deleteFile, renameFile, toggleStar } =
		useVaultFileActions(onRefresh);

	const currentFolderId = contents?.folder?.id;

	const { uploadFiles, uploadQueue, isUploading, clearQueue } = useVaultUpload({
		currentFolderId,
		onUploadComplete: onRefresh,
	});

	const activeProviders =
		providersData?.storageProviders.filter((p) => p.isActive) ?? [];

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files ?? []);
			if (!files.length) return;

			if (activeProviders.length === 0) {
				toast.error("No storage providers connected");
				return;
			}

			// Use first active provider (could show picker dialog for multiple)
			const providerId = activeProviders[0]?.id;
			if (!providerId) return;

			uploadFiles(files, providerId);

			// Reset input
			if (fileInputRef.current) fileInputRef.current.value = "";
		},
		[activeProviders, uploadFiles],
	);

	const handleCreateFolder = useCallback(async () => {
		if (!newFolderName.trim()) return;

		setIsCreatingFolder(true);
		try {
			const result = await createVaultFolder({
				name: newFolderName.trim(),
				parentId: currentFolderId,
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			setIsCreateFolderOpen(false);
			setNewFolderName("");
			onRefresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create folder",
			);
		} finally {
			setIsCreatingFolder(false);
		}
	}, [newFolderName, currentFolderId, createVaultFolder, onRefresh]);

	// Build breadcrumbs from path
	const breadcrumbs = buildVaultBreadcrumbs(currentPath);

	const files = contents?.files ?? [];
	const folders = contents?.folders ?? [];

	return (
		<div className="p-8 flex flex-col gap-6 h-full">
			{/* Toolbar */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{/* Breadcrumbs */}
					<div className="flex items-center gap-1 text-sm">
						{breadcrumbs.map((crumb, i) => (
							<span key={crumb.path} className="flex items-center gap-1">
								{i > 0 && (
									<span className="text-muted-foreground">/</span>
								)}
								<button
									type="button"
									onClick={() => onNavigate(crumb.path)}
									className={
										i === breadcrumbs.length - 1
											? "font-medium text-foreground cursor-default"
											: "text-muted-foreground hover:text-foreground"
									}
								>
									{crumb.label}
								</button>
							</span>
						))}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() => setIsCreateFolderOpen(true)}
					>
						<FolderPlus className="w-4 h-4" />
						New Folder
					</Button>

					<input
						ref={fileInputRef}
						type="file"
						multiple
						className="hidden"
						onChange={handleFileSelect}
					/>
					<Button
						size="sm"
						className="gap-2"
						onClick={() => fileInputRef.current?.click()}
						disabled={isUploading}
					>
						<Upload className="w-4 h-4" />
						{isUploading ? "Uploading..." : "Upload"}
					</Button>
				</div>
			</div>

			{/* File table */}
			<div className="flex-1 overflow-y-auto">
				{isFetching && files.length === 0 && folders.length === 0 ? (
					<div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
						Loading...
					</div>
				) : files.length === 0 && folders.length === 0 ? (
					<VaultEmptyState onUpload={() => fileInputRef.current?.click()} />
				) : (
					<VaultTable
						files={files}
						folders={folders}
						onNavigate={(folder) => onNavigate(folder.virtualPath)}
						onDownload={downloadFile}
						onDelete={(file) => deleteFile(file.id)}
						onRename={(file, name) => renameFile(file.id, name)}
						onToggleStar={(file) => toggleStar(file.id, file.starred)}
					/>
				)}
			</div>

			{/* Create folder dialog */}
			<Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New Folder</DialogTitle>
					</DialogHeader>
					<Input
						value={newFolderName}
						onChange={(e) => setNewFolderName(e.target.value)}
						placeholder="Folder name"
						autoFocus
						onKeyDown={(e) => {
							if (e.key === "Enter") handleCreateFolder();
						}}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsCreateFolderOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateFolder}
							disabled={isCreatingFolder || !newFolderName.trim()}
						>
							{isCreatingFolder ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Upload progress */}
			{uploadQueue.length > 0 && (
				<UploadProgressPanel
					items={uploadQueue}
					onClose={clearQueue}
					onCancel={() => {}}
					onRetry={() => {}}
				/>
			)}
		</div>
	);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VaultEmptyState({ onUpload }: { onUpload: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center h-60 gap-4 text-center">
			<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
				<Lock className="w-8 h-8 text-muted-foreground" />
			</div>
			<div>
				<p className="font-medium">Vault is empty</p>
				<p className="text-sm text-muted-foreground mt-1">
					Upload files to store them encrypted in your vault.
				</p>
			</div>
			<Button variant="outline" onClick={onUpload}>
				Upload Files
			</Button>
		</div>
	);
}

interface VaultTableProps {
	files: VaultFile[];
	folders: VaultFolder[];
	onNavigate: (folder: VaultFolder) => void;
	onDownload: (file: VaultFile) => void;
	onDelete: (file: VaultFile) => void;
	onRename: (file: VaultFile, name: string) => void;
	onToggleStar: (file: VaultFile) => void;
}

function VaultTable({
	files,
	folders,
	onNavigate,
	onDownload,
	onDelete,
	onRename,
	onToggleStar,
}: VaultTableProps) {
	return (
		<div className="rounded-md border">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b bg-muted/50">
						<th className="py-3 px-4 text-left font-medium text-muted-foreground">
							Name
						</th>
						<th className="py-3 px-4 text-left font-medium text-muted-foreground w-32">
							Size
						</th>
						<th className="py-3 px-4 text-left font-medium text-muted-foreground w-40">
							Modified
						</th>
						<th className="py-3 px-4 w-12" />
					</tr>
				</thead>
				<tbody>
					{folders.map((folder) => (
						<tr
							key={folder.id}
							className="border-b hover:bg-muted/30 cursor-pointer"
							onClick={() => onNavigate(folder)}
						>
							<td className="py-3 px-4">
								<div className="flex items-center gap-2">
									<span className="text-muted-foreground">📁</span>
									<span className="font-medium">{folder.name}</span>
								</div>
							</td>
							<td className="py-3 px-4 text-muted-foreground">—</td>
							<td className="py-3 px-4 text-muted-foreground">
								{new Date(folder.updatedAt).toLocaleDateString()}
							</td>
							<td className="py-3 px-4" />
						</tr>
					))}
					{files.map((file) => (
						<VaultFileRow
							key={file.id}
							file={file}
							onDownload={onDownload}
							onDelete={onDelete}
							onRename={onRename}
							onToggleStar={onToggleStar}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

interface VaultFileRowProps {
	file: VaultFile;
	onDownload: (file: VaultFile) => void;
	onDelete: (file: VaultFile) => void;
	onRename: (file: VaultFile, name: string) => void;
	onToggleStar: (file: VaultFile) => void;
}

function VaultFileRow({
	file,
	onDownload,
	onDelete,
	onRename,
	onToggleStar,
}: VaultFileRowProps) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [newName, setNewName] = useState(file.name);

	const handleRenameSubmit = () => {
		if (newName.trim() && newName !== file.name) {
			onRename(file, newName.trim());
		}
		setIsRenaming(false);
	};

	return (
		<tr className="border-b hover:bg-muted/30">
			<td className="py-3 px-4">
				<div className="flex items-center gap-2">
					<Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
					{isRenaming ? (
						<Input
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onBlur={handleRenameSubmit}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleRenameSubmit();
								if (e.key === "Escape") setIsRenaming(false);
							}}
							autoFocus
							className="h-7 py-1"
						/>
					) : (
						<button
							type="button"
							className="text-left font-medium hover:underline"
							onDoubleClick={() => setIsRenaming(true)}
						>
							{file.name}
						</button>
					)}
				</div>
			</td>
			<td className="py-3 px-4 text-muted-foreground">
				{formatFileSize(file.size)}
			</td>
			<td className="py-3 px-4 text-muted-foreground">
				{new Date(file.updatedAt).toLocaleDateString()}
			</td>
			<td className="py-3 px-4">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"
						>
							⋯
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onDownload(file)}>
							Download
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setIsRenaming(true)}>
							Rename
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onToggleStar(file)}>
							{file.starred ? "Unstar" : "Star"}
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-destructive"
							onClick={() => onDelete(file)}
						>
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</td>
		</tr>
	);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildVaultBreadcrumbs(path: string) {
	const crumbs: Array<{ label: string; path: string }> = [
		{ label: "Home", path: "/" },
	];

	if (path === "/" || path === "") return crumbs;

	// Strip vault prefix if present (e.g., /vault/userId/...)
	const vaultPrefixMatch = path.match(/^\/vault\/[^/]+(.*)$/);
	const relativePath = vaultPrefixMatch?.[1] ?? path;

	const parts = relativePath.split("/").filter(Boolean);
	let accumulated = "";

	for (const part of parts) {
		accumulated += `/${part}`;
		crumbs.push({ label: part, path: accumulated });
	}

	return crumbs;
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}
