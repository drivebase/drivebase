import { useMemo } from "react";
import {
	useRecentFiles,
	useSearchFiles,
	useSearchFilesAi,
	useSearchFolders,
} from "@/features/files/hooks/useFiles";
import {
	getActiveWorkspaceId,
	useWorkspaceAiSettings,
} from "@/features/workspaces";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import {
	NAVIGATION_ITEMS,
	RECENT_LIMIT,
	SEARCH_LIMIT,
	type NavigationItem,
} from "./constants";

type MergedSearchResult =
	| {
			kind: "file";
			id: string;
			name: string;
			priority: number;
			file: FileItemFragment;
	  }
	| {
			kind: "folder";
			id: string;
			name: string;
			priority: number;
			folder: FolderItemFragment;
	  };

type Params = {
	open: boolean;
	isAiMode: boolean;
	hasQuery: boolean;
	debouncedQuery: string;
	deletedFileIds: Set<string>;
};

export function usePaletteSearchData({
	open,
	isAiMode,
	hasQuery,
	debouncedQuery,
	deletedFileIds,
}: Params) {
	const activeWorkspaceId = getActiveWorkspaceId() ?? "";
	const [workspaceAiSettingsResult] = useWorkspaceAiSettings(
		activeWorkspaceId,
		!open || !isAiMode || !activeWorkspaceId,
	);
	const aiProcessingEnabled =
		workspaceAiSettingsResult.data?.workspaceAiSettings?.enabled === true;
	const aiProcessingDisabled =
		workspaceAiSettingsResult.data?.workspaceAiSettings?.enabled === false;
	const canRunAiSearch = hasQuery && isAiMode && aiProcessingEnabled;

	const { data: recentData } = useRecentFiles(RECENT_LIMIT);
	const filesSearchResult = useSearchFiles(
		hasQuery && !isAiMode ? debouncedQuery : "",
		SEARCH_LIMIT,
	);
	const filesAiSearchResult = useSearchFilesAi(
		canRunAiSearch ? debouncedQuery : "",
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
		if (!hasQuery) return [] as MergedSearchResult[];

		const normalizedQuery = debouncedQuery.toLowerCase();
		const score = (name: string) =>
			name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;

		const results: MergedSearchResult[] = [
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
		() =>
			mergedResults
				.filter(
					(item): item is Extract<MergedSearchResult, { kind: "file" }> =>
						item.kind === "file",
				)
				.map((item) => item.file),
		[mergedResults],
	);
	const visibleAiFileResults = useMemo(
		() => aiSearchFiles.filter((file) => !deletedFileIds.has(file.id)),
		[aiSearchFiles, deletedFileIds],
	);
	const visibleFolderResults = useMemo(
		() =>
			mergedResults
				.filter(
					(item): item is Extract<MergedSearchResult, { kind: "folder" }> =>
						item.kind === "folder",
				)
				.map((item) => item.folder),
		[mergedResults],
	);
	const matchedNavigationItems = useMemo(() => {
		if (!hasQuery) return [] as NavigationItem[];

		const normalizedQuery = debouncedQuery.toLowerCase();
		const score = (label: string) =>
			label.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;

		return NAVIGATION_ITEMS.filter((item) =>
			item.label.toLowerCase().includes(normalizedQuery),
		).sort((a, b) => score(a.label) - score(b.label));
	}, [hasQuery, debouncedQuery]);

	return {
		aiProcessingDisabled,
		visibleRecentFiles,
		matchedNavigationItems,
		visibleAiFileResults,
		visibleFileResults,
		visibleFolderResults,
		mergedResultsCount: mergedResults.length,
	};
}
