import { useMemo } from "react";
import {
	useRecentFiles,
	useSearchFiles,
	useSearchFolders,
} from "@/features/files/hooks/useFiles";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import {
	NAVIGATION_ITEMS,
	type NavigationItem,
	RECENT_LIMIT,
	SEARCH_LIMIT,
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
	hasQuery: boolean;
	debouncedQuery: string;
	deletedFileIds: Set<string>;
};

export function usePaletteSearchData({
	open: _open,
	hasQuery,
	debouncedQuery,
	deletedFileIds,
}: Params) {
	const { data: recentData } = useRecentFiles(RECENT_LIMIT);
	const filesSearchResult = useSearchFiles(
		hasQuery ? debouncedQuery : "",
		SEARCH_LIMIT,
	);
	const foldersSearchResult = useSearchFolders(
		hasQuery ? debouncedQuery : "",
		SEARCH_LIMIT,
	);

	const searchFiles =
		(filesSearchResult.data?.searchFiles as FileItemFragment[] | undefined) ??
		[];
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
		visibleRecentFiles,
		matchedNavigationItems,
		visibleFileResults,
		visibleFolderResults,
		mergedResultsCount: mergedResults.length,
	};
}
