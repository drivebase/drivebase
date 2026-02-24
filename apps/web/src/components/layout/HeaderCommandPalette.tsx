import { useNavigate } from "@tanstack/react-router";
import {
	Clock3,
	Cloud,
	Download,
	File,
	Folder,
	FolderOpen,
	Lock,
	Search,
	Settings,
	Star,
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import { FileInfoPanel } from "@/features/files/FileInfoPanel";
import { useDownload } from "@/features/files/hooks/useDownload";
import {
	useDeleteFile,
	useRecentFiles,
	useSearchFilesAi,
	useSearchFiles,
	useSearchFolders,
	useStarFile,
	useUnstarFile,
} from "@/features/files/hooks/useFiles";
import { formatSize } from "@/features/files/utils";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import { useRightPanelStore } from "@/shared/store/rightPanelStore";

const SEARCH_LIMIT = 10;
const RECENT_LIMIT = 3;

const NAVIGATION_ITEMS = [
	{ label: "Files", to: "/files", icon: FolderOpen },
	{ label: "Starred", to: "/starred", icon: Star },
	{ label: "Providers", to: "/providers", icon: Cloud },
	{ label: "Vault", to: "/vault", icon: Lock },
	{ label: "Settings", to: "/settings/general", icon: Settings },
] as const;

function debounceValue(value: string, delay = 200) {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebounced(value), delay);
		return () => window.clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}

export function HeaderCommandPalette() {
	const navigate = useNavigate();
	const { downloadFile } = useDownload();
	const [, deleteFile] = useDeleteFile();
	const [, starFile] = useStarFile();
	const [, unstarFile] = useUnstarFile();
	const setRightPanelContent = useRightPanelStore((state) => state.setContent);

	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [isAiMode, setIsAiMode] = useState(false);
	const [selectedFile, setSelectedFile] = useState<FileItemFragment | null>(
		null,
	);
	const [deletedFileIds, setDeletedFileIds] = useState<Set<string>>(new Set());

	const debouncedQuery = debounceValue(query.trim(), 200);
	const hasQuery = debouncedQuery.length > 0;

	const { data: recentData } = useRecentFiles(RECENT_LIMIT);
	const filesSearchResult = useSearchFiles(
		hasQuery && !isAiMode ? debouncedQuery : "",
		SEARCH_LIMIT,
	);
	const filesAiSearchResult = useSearchFilesAi(
		hasQuery && isAiMode ? debouncedQuery : "",
		SEARCH_LIMIT,
	);
	const foldersSearchResult = useSearchFolders(
		hasQuery && !isAiMode ? debouncedQuery : "",
		SEARCH_LIMIT,
	);

	const searchFiles =
		(filesSearchResult.data?.searchFiles as FileItemFragment[] | undefined) ??
		[];
	const aiSearchFiles =
		(filesAiSearchResult.data?.searchFilesAi as
			| FileItemFragment[]
			| undefined) ?? [];
	const searchFolders =
		(foldersSearchResult.data?.searchFolders as
			| FolderItemFragment[]
			| undefined) ?? [];
	const recentFiles =
		(recentData?.recentFiles as FileItemFragment[] | undefined) ?? [];

	const visibleRecentFiles = useMemo(
		() =>
			recentFiles
				.filter((file) => !deletedFileIds.has(file.id))
				.slice(0, RECENT_LIMIT),
		[recentFiles, deletedFileIds],
	);

	const mergedResults = useMemo(() => {
		if (!hasQuery) return [];

		const normalizedQuery = debouncedQuery.toLowerCase();

		const score = (name: string) => {
			const lowered = name.toLowerCase();
			return lowered.startsWith(normalizedQuery) ? 0 : 1;
		};

		const results = [
			...searchFiles
				.filter((file) => !deletedFileIds.has(file.id))
				.map((file) => ({
					kind: "file" as const,
					id: file.id,
					name: file.name,
					priority: score(file.name),
					file,
				})),
			...searchFolders.map((folder) => ({
				kind: "folder" as const,
				id: folder.id,
				name: folder.name,
				priority: score(folder.name),
				folder,
			})),
		];

		return results
			.sort(
				(a, b) =>
					a.priority - b.priority || a.name.localeCompare(b.name, undefined),
			)
			.slice(0, SEARCH_LIMIT);
	}, [hasQuery, debouncedQuery, searchFiles, searchFolders, deletedFileIds]);

	const visibleFileResults = useMemo(
		() => mergedResults.filter((item) => item.kind === "file"),
		[mergedResults],
	);
	const visibleAiFileResults = useMemo(
		() => aiSearchFiles.filter((file) => !deletedFileIds.has(file.id)),
		[aiSearchFiles, deletedFileIds],
	);
	const visibleFolderResults = useMemo(
		() => mergedResults.filter((item) => item.kind === "folder"),
		[mergedResults],
	);
	const matchedNavigationItems = useMemo(() => {
		if (!hasQuery) return [];

		const normalizedQuery = debouncedQuery.toLowerCase();
		const score = (label: string) => {
			const lowered = label.toLowerCase();
			return lowered.startsWith(normalizedQuery) ? 0 : 1;
		};

		return NAVIGATION_ITEMS.filter((item) =>
			item.label.toLowerCase().includes(normalizedQuery),
		).sort((a, b) => score(a.label) - score(b.label));
	}, [hasQuery, debouncedQuery]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen((prev) => !prev);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	useEffect(() => {
		if (!open) {
			setQuery("");
			setSelectedFile(null);
			setIsAiMode(false);
		}
	}, [open]);

	const openFile = (file: FileItemFragment) => {
		navigate({
			to: "/files",
			search: { folderId: file.folderId ?? undefined },
		});
		setRightPanelContent(<FileInfoPanel fileId={file.id} />);
		setOpen(false);
	};

	const handleDeleteFile = async (file: FileItemFragment) => {
		const confirmed = await confirmDialog(
			"Delete File",
			`Delete "${file.name}"? This action cannot be undone.`,
		);
		if (!confirmed) return;

		const result = await deleteFile({ id: file.id });
		if (result.error) {
			return;
		}

		setDeletedFileIds((prev) => new Set([...prev, file.id]));
		if (selectedFile?.id === file.id) {
			setSelectedFile(null);
		}
		setOpen(false);
	};

	const handleToggleStar = async (file: FileItemFragment) => {
		if (file.starred) {
			const result = await unstarFile({ id: file.id });
			if (result.data?.unstarFile) {
				setSelectedFile(result.data.unstarFile as FileItemFragment);
			}
			return;
		}

		const result = await starFile({ id: file.id });
		if (result.data?.starFile) {
			setSelectedFile(result.data.starFile as FileItemFragment);
		}
	};

	return (
		<>
			<Button
				type="button"
				variant="outline"
				onClick={() => setOpen(true)}
				className="w-full min-w-44 max-w-xs inline-flex items-center gap-2 justify-start text-muted-foreground hover:text-foreground"
			>
				<Search className="h-4 w-4" />
				<span className="flex-1 text-left">Search files and folders...</span>
				<kbd className="text-xs text-muted-foreground">⌘K / Ctrl+K</kbd>
			</Button>

			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				title="Search"
				description="Search files, folders, and navigation"
			>
				<div className="w-full">
					<Command
						key={
							selectedFile
								? `file-actions:${selectedFile.id}`
								: "search-results"
						}
						shouldFilter={false}
						className="w-full"
					>
						<CommandInput
							placeholder={
								isAiMode
									? "AI mode: describe what you want to find"
									: "Search files and folders... (Press Tab for AI Mode)"
							}
							value={query}
							onValueChange={setQuery}
							onKeyDown={(event) => {
								if (event.key === "Tab") {
									event.preventDefault();
									setIsAiMode((prev) => !prev);
								}
							}}
						/>
						<CommandList>
							{selectedFile ? (
								<CommandGroup heading="Actions">
									<CommandItem onSelect={() => setSelectedFile(null)}>
										<Search className="h-4 w-4" />
										Back to results
									</CommandItem>
									<CommandSeparator />
									<CommandItem onSelect={() => openFile(selectedFile)}>
										<File className="h-4 w-4" />
										Open
									</CommandItem>
									<CommandItem
										onSelect={async () => {
											await downloadFile(selectedFile);
											setOpen(false);
										}}
									>
										<Download className="h-4 w-4" />
										Download
									</CommandItem>
									<CommandItem onSelect={() => handleToggleStar(selectedFile)}>
										<Star className="h-4 w-4" />
										{selectedFile.starred
											? "Remove from Starred"
											: "Add to Starred"}
									</CommandItem>
									<CommandItem onSelect={() => handleDeleteFile(selectedFile)}>
										<Trash2 className="h-4 w-4" />
										Delete
									</CommandItem>
								</CommandGroup>
							) : hasQuery ? (
								<>
									{!isAiMode && matchedNavigationItems.length > 0 ? (
										<>
											<CommandGroup heading="Navigation">
												{matchedNavigationItems.map((item) => (
													<CommandItem
														key={`search-nav:${item.to}`}
														onSelect={() => {
															navigate({ to: item.to });
															setOpen(false);
														}}
													>
														<item.icon className="h-4 w-4" />
														{item.label}
													</CommandItem>
												))}
											</CommandGroup>
											<CommandSeparator />
										</>
									) : null}
									{isAiMode && visibleAiFileResults.length > 0 ? (
										<CommandGroup heading="AI Results">
											{visibleAiFileResults.map((file) => (
												<CommandItem
													key={`ai-file:${file.id}`}
													onSelect={() => setSelectedFile(file)}
												>
													<ProviderIcon
														type={file.provider.type}
														className="h-4 w-4"
													/>
													<span className="flex-1 truncate">{file.name}</span>
													<CommandShortcut>
														{formatSize(file.size)}
													</CommandShortcut>
												</CommandItem>
											))}
										</CommandGroup>
									) : null}
									{!isAiMode && visibleFileResults.length > 0 ? (
										<CommandGroup heading="Files">
											{visibleFileResults.map((result) => (
												<CommandItem
													key={`file:${result.id}`}
													onSelect={() => setSelectedFile(result.file)}
												>
													<ProviderIcon
														type={result.file.provider.type}
														className="h-4 w-4"
													/>
													<span className="flex-1 truncate">
														{result.file.name}
													</span>
													<CommandShortcut>
														{formatSize(result.file.size)}
													</CommandShortcut>
												</CommandItem>
											))}
										</CommandGroup>
									) : null}
									{!isAiMode && visibleFolderResults.length > 0 ? (
										<CommandGroup heading="Folders">
											{visibleFolderResults.map((result) => (
												<CommandItem
													key={`folder:${result.id}`}
													onSelect={() => {
														navigate({
															to: "/files",
															search: { folderId: result.folder.id },
														});
														setOpen(false);
													}}
												>
													<ProviderIcon
														type={result.folder.provider.type}
														className="h-4 w-4"
													/>
													<Folder className="h-4 w-4 text-muted-foreground" />
													<span className="truncate">{result.folder.name}</span>
												</CommandItem>
											))}
										</CommandGroup>
									) : null}
									{isAiMode && visibleAiFileResults.length === 0 ? (
										<CommandEmpty>No AI results found.</CommandEmpty>
									) : null}
									{!isAiMode && mergedResults.length === 0 ? (
										<CommandEmpty>No results found.</CommandEmpty>
									) : null}
								</>
							) : isAiMode ? (
								<CommandEmpty>Type a query to search in AI mode.</CommandEmpty>
							) : (
								<>
									<CommandGroup heading="Navigation">
										{NAVIGATION_ITEMS.map((item) => (
											<CommandItem
												key={item.to}
												onSelect={() => {
													navigate({ to: item.to });
													setOpen(false);
												}}
											>
												<item.icon className="h-4 w-4" />
												{item.label}
											</CommandItem>
										))}
									</CommandGroup>
									<CommandSeparator />
									<CommandGroup heading="Recent files">
										{visibleRecentFiles.map((file) => (
											<CommandItem
												key={file.id}
												onSelect={() => setSelectedFile(file)}
											>
												<Clock3 className="h-4 w-4 text-muted-foreground" />
												<ProviderIcon
													type={file.provider.type}
													className="h-4 w-4"
												/>
												<span className="flex-1 truncate">{file.name}</span>
												<CommandShortcut>
													{formatSize(file.size)}
												</CommandShortcut>
											</CommandItem>
										))}
										{visibleRecentFiles.length === 0 ? (
											<CommandItem disabled>No recent files</CommandItem>
										) : null}
									</CommandGroup>
								</>
							)}
						</CommandList>
					</Command>
				</div>
			</CommandDialog>
		</>
	);
}
