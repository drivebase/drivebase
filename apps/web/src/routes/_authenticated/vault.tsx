import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDropZone } from "@/features/files/components/FileDropZone";
import { FilesToolbar } from "@/features/files/components/FilesToolbar";
import { FileSystemTable } from "@/features/files/FileSystemTable";
import { useBreadcrumbs } from "@/features/files/hooks/useBreadcrumbs";
import { useFileDrop } from "@/features/files/hooks/useFileDrop";

import { UploadProviderDialog } from "@/features/files/UploadProviderDialog";
import { useProviders } from "@/features/providers/hooks/useProviders";
import { VaultSetupWizard } from "@/features/vault/components/VaultSetupWizard";
import { VaultUnlockPrompt } from "@/features/vault/components/VaultUnlockPrompt";
import {
	useCreateVaultFolder,
	useMyVault,
	useVaultContents,
} from "@/features/vault/hooks/useVault";
import { useVaultFileActions } from "@/features/vault/hooks/useVaultFileActions";
import { useVaultUpload } from "@/features/vault/hooks/useVaultUpload";
import { useVaultStore } from "@/features/vault/store/vaultStore";
import type {
	FileItemFragment,
	FolderItemFragment,
	StorageProvider,
} from "@/gql/graphql";
import { useOptimisticList } from "@/shared/hooks/useOptimisticList";
import { promptDialog } from "@/shared/lib/promptDialog";

const searchSchema = z.object({
	folderId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/vault")({
	validateSearch: (search) => searchSchema.parse(search),
	component: VaultPage,
});

function VaultPage() {
	const { folderId } = Route.useSearch();
	const { isUnlocked } = useVaultStore();
	const [{ data, fetching }] = useMyVault();

	if (fetching) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-muted-foreground text-sm">Loading...</div>
			</div>
		);
	}

	if (!data?.myVault) {
		return (
			<div className="flex items-center justify-center h-full">
				<VaultSetupWizard onComplete={() => window.location.reload()} />
			</div>
		);
	}

	if (!isUnlocked) {
		return (
			<div className="flex items-center justify-center h-full">
				<VaultUnlockPrompt onUnlocked={() => {}} />
			</div>
		);
	}

	return <VaultBrowser folderId={folderId} />;
}

function VaultBrowser({ folderId }: { folderId?: string }) {
	const navigate = Route.useNavigate();
	const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const { data: providersData } = useProviders();
	const activeProviders = (providersData?.storageProviders.filter(
		(p) => p.isActive,
	) ?? []) as StorageProvider[];

	const [{ data: contentsData, fetching: contentsFetching }, refreshContents] =
		useVaultContents(folderId ?? null);

	const currentFolder = contentsData?.vaultContents?.folder as
		| FolderItemFragment
		| undefined;

	const fileList = useOptimisticList<FileItemFragment>(
		contentsData?.vaultContents?.files as FileItemFragment[] | undefined,
	);
	const folderList = useOptimisticList<FolderItemFragment>(
		contentsData?.vaultContents?.folders as FolderItemFragment[] | undefined,
	);

	const refresh = () => refreshContents({ requestPolicy: "network-only" });

	const { uploadFiles, isUploading } = useVaultUpload({
		currentFolderId: currentFolder?.id,
		onUploadComplete: refresh,
	});

	const { downloadFile, renameFile, deleteFile, toggleStar } =
		useVaultFileActions(refresh);

	const [, createVaultFolder] = useCreateVaultFolder();

	const breadcrumbs = useBreadcrumbs(currentFolder);

	const isRoot = !folderId;

	const handleFilesSelected = (files: File[]) => {
		if (!files.length) return;
		if (activeProviders.length === 0) {
			toast.error("No storage providers connected");
			return;
		}
		if (activeProviders.length === 1 && activeProviders[0]) {
			uploadFiles(files, activeProviders[0].id);
		} else {
			setSelectedFiles(files);
			setIsUploadDialogOpen(true);
		}
	};

	const { isDragActive, dragHandlers } = useFileDrop({
		onDrop: handleFilesSelected,
	});

	const handleNavigate = (targetFolderId: string) => {
		navigate({ search: { folderId: targetFolderId } });
	};

	const handleBreadcrumbClick = (targetFolderId: string | null) => {
		navigate({ search: { folderId: targetFolderId ?? undefined } });
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		handleFilesSelected(files);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleRenameFile = async (file: FileItemFragment) => {
		const newName = await promptDialog("Rename File", `Rename "${file.name}"`, {
			defaultValue: file.name,
			placeholder: "Enter new name",
			submitLabel: "Rename",
		});
		if (!newName || newName === file.name) return;
		fileList.updateItem(file.id, { name: newName });
		const ok = await renameFile(file.id, newName);
		if (!ok) fileList.resetItem(file.id);
	};

	const handleDeleteSelection = async (selection: {
		files: FileItemFragment[];
		folders: FolderItemFragment[];
	}) => {
		for (const file of selection.files) {
			fileList.setItems((prev) => prev.filter((f) => f.id !== file.id));
			await deleteFile(file.id);
		}
		if (selection.folders.length > 0) {
			toast.info("Folder deletion is not yet supported in vault");
		}
	};

	const handleToggleFileFavorite = (file: FileItemFragment) => {
		const currentStarred =
			fileList.items.find((f) => f.id === file.id)?.starred ?? file.starred;
		fileList.updateItem(file.id, { starred: !currentStarred });
		toggleStar(file.id, currentStarred).then((ok) => {
			if (!ok) fileList.resetItem(file.id);
		});
	};

	const handleCreateFolder = async () => {
		if (!newFolderName.trim() || activeProviders.length === 0) return;
		setIsCreatingFolder(true);
		try {
			const result = await createVaultFolder({
				name: newFolderName.trim(),
				parentId: currentFolder?.id,
				providerId: activeProviders[0].id,
			});
			if (result.error) throw new Error(result.error.message);
			setIsCreateFolderOpen(false);
			setNewFolderName("");
			refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create folder",
			);
		} finally {
			setIsCreatingFolder(false);
		}
	};

	return (
		<div className="px-8 flex flex-col gap-6 h-full relative" {...dragHandlers}>
			<FilesToolbar
				isRoot={isRoot}
				breadcrumbs={breadcrumbs}
				canWriteFiles={true}
				isUploading={isUploading}
				isLoading={contentsFetching}
				providers={activeProviders}
				filterProviderIds={[]}
				onFilterChange={() => {}}
				onBreadcrumbClick={handleBreadcrumbClick}
				onUploadClick={() => fileInputRef.current?.click()}
				onNewFolder={() => setIsCreateFolderOpen(true)}
				fileInputRef={fileInputRef}
				onFileChange={handleFileChange}
			/>

			<div className="flex-1 overflow-y-auto">
				<FileSystemTable
					files={fileList.items}
					folders={folderList.items}
					providers={providersData?.storageProviders}
					onNavigate={handleNavigate}
					onDownloadFile={downloadFile}
					onToggleFileFavorite={handleToggleFileFavorite}
					onRenameFile={handleRenameFile}
					onDeleteSelection={handleDeleteSelection}
					isLoading={contentsFetching && !contentsData}
					emptyStateMessage="Your vault is empty. Upload files to store them encrypted."
				/>
			</div>

			<Dialog
				open={isCreateFolderOpen}
				onOpenChange={(open) => !open && setIsCreateFolderOpen(false)}
			>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Create Folder</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="vault-folder-name">Folder Name</Label>
							<Input
								id="vault-folder-name"
								value={newFolderName}
								onChange={(e) => setNewFolderName(e.target.value)}
								placeholder="New Folder"
								autoFocus
								onKeyDown={(e) => {
									if (e.key === "Enter") handleCreateFolder();
								}}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => setIsCreateFolderOpen(false)}
							disabled={isCreatingFolder}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateFolder}
							disabled={isCreatingFolder || !newFolderName.trim()}
						>
							{isCreatingFolder ? "Creating..." : "Create Folder"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<UploadProviderDialog
				isOpen={isUploadDialogOpen}
				onClose={() => setIsUploadDialogOpen(false)}
				providers={activeProviders}
				fileName={selectedFiles[0]?.name}
				fileMimeType={selectedFiles[0]?.type}
				fileSize={selectedFiles[0]?.size}
				onSelectProvider={(providerId) => {
					setIsUploadDialogOpen(false);
					uploadFiles(selectedFiles, providerId);
				}}
			/>

			<FileDropZone isDragActive={isDragActive} />
		</div>
	);
}
