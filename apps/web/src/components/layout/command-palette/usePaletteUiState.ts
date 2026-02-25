import { useEffect, useState } from "react";
import type { FileItemFragment } from "@/gql/graphql";
import { useDebouncedValue } from "./useDebouncedValue";

export function usePaletteUiState() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [isAiMode, setIsAiMode] = useState(false);
	const [selectedFile, setSelectedFile] = useState<FileItemFragment | null>(
		null,
	);
	const [deletedFileIds, setDeletedFileIds] = useState<Set<string>>(new Set());

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
			setIsAiMode(false);
		}
	}, [open]);

	return {
		open,
		setOpen,
		query,
		setQuery,
		debouncedQuery,
		hasQuery,
		isAiMode,
		toggleAiMode: () => setIsAiMode((prev) => !prev),
		selectedFile,
		setSelectedFile,
		deletedFileIds,
		setDeletedFileIds,
	};
}
