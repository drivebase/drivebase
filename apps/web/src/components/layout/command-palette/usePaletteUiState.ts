import { useEffect, useState } from "react";
import type { FileItemFragment } from "@/gql/graphql";
import { useDebouncedValue } from "./useDebouncedValue";

export type SearchMode = "filename" | "smart";

export function usePaletteUiState() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedFile, setSelectedFile] = useState<FileItemFragment | null>(
		null,
	);
	const [deletedFileIds, setDeletedFileIds] = useState<Set<string>>(new Set());
	const [searchMode, setSearchMode] = useState<SearchMode>("filename");

	const debouncedQuery = useDebouncedValue(query.trim(), 200);
	const hasQuery = debouncedQuery.length > 0;

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
			setSearchMode("filename");
		}
	}, [open]);

	return {
		open,
		setOpen,
		query,
		setQuery,
		debouncedQuery,
		hasQuery,
		selectedFile,
		setSelectedFile,
		deletedFileIds,
		setDeletedFileIds,
		searchMode,
		setSearchMode,
	};
}
