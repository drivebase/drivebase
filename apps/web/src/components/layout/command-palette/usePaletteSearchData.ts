import { useMemo } from "react";
import {
	useSearchFiles,
	useSearchFolders,
	useSmartSearch,
} from "@/features/files/hooks/useFiles";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import {
	NAVIGATION_ITEMS,
	type NavigationItem,
	SEARCH_LIMIT,
} from "./constants";
import type { SearchMode } from "./usePaletteUiState";

export type SmartSearchResultItem = {
	file: FileItemFragment;
	headline: string;
	rank: number;
};

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
	hasQuery: boolean;
	debouncedQuery: string;
	deletedFileIds: Set<string>;
	searchMode: SearchMode;
};

export function usePaletteSearchData({
	open: _open,
	hasQuery,
	debouncedQuery,
	deletedFileIds,
	searchMode,
}: Params) {
	const isFilenameMode = searchMode === "filename";
	const isSmartMode = searchMode === "smart";

	const filesSearchResult = useSearchFiles(
		hasQuery && isFilenameMode ? debouncedQuery : "",
		SEARCH_LIMIT,
	);
	const foldersSearchResult = useSearchFolders(
		hasQuery && isFilenameMode ? debouncedQuery : "",
		SEARCH_LIMIT,
	);
	const smartSearchResult = useSmartSearch(
		hasQuery ? debouncedQuery : "",
		SEARCH_LIMIT,
		!isSmartMode,
	);

	const searchFiles =
		(filesSearchResult.data?.searchFiles as FileItemFragment[] | undefined) ??
		[];
	const searchFolders =
		(foldersSearchResult.data?.searchFolders as
			| FolderItemFragment[]
			| undefined) ?? [];

	const smartSearchResults: SmartSearchResultItem[] = useMemo(() => {
		if (!isSmartMode || !hasQuery) return [];
		const results = smartSearchResult.data?.smartSearch;
		if (!results) return [];
		return (
			results as Array<{
				file: FileItemFragment;
				headline: string;
				rank: number;
			}>
		).map((r) => ({
			file: r.file as FileItemFragment,
			headline: r.headline,
			rank: r.rank,
		}));
	}, [isSmartMode, hasQuery, smartSearchResult.data]);

	const mergedResults = useMemo(() => {
		if (!hasQuery || isSmartMode) return [] as MergedSearchResult[];

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
	}, [
		hasQuery,
		isSmartMode,
		debouncedQuery,
		searchFiles,
		searchFolders,
		deletedFileIds,
	]);

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
		if (!hasQuery || isSmartMode) return [] as NavigationItem[];

		const normalizedQuery = debouncedQuery.toLowerCase();
		const score = (label: string) =>
			label.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;

		return NAVIGATION_ITEMS.filter((item) =>
			item.label.toLowerCase().includes(normalizedQuery),
		).sort((a, b) => score(a.label) - score(b.label));
	}, [hasQuery, isSmartMode, debouncedQuery]);

	return {
		matchedNavigationItems,
		visibleFileResults,
		visibleFolderResults,
		mergedResultsCount: mergedResults.length,
		smartSearchResults,
		isSmartSearchFetching: smartSearchResult.fetching,
	};
}
