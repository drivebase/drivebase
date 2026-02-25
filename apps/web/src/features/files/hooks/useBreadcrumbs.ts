import { useMemo } from "react";
import type { FolderItemFragment } from "@/gql/graphql";

export interface BreadcrumbItem {
	name: string;
	folderId: string | null;
}

/**
 * Build breadcrumb items from the current folder's virtualPath segments.
 * Each crumb gets a folderId only for the current folder and its parent
 * (the rest are null since we don't have their IDs from the query).
 */
export function useBreadcrumbs(currentFolder: FolderItemFragment | undefined) {
	const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
		if (!currentFolder) return [];

		const path = currentFolder.virtualPath;
		if (!path || path === "/") return [];

		// virtualPath looks like "/Documents/Work/" — split into segments
		const parts = path.split("/").filter(Boolean);

		return parts.map((part, index) => ({
			name: part,
			folderId:
				index === parts.length - 1
					? currentFolder.id
					: index === parts.length - 2
						? (currentFolder.parentId ?? null)
						: null,
		}));
	}, [currentFolder]);

	return breadcrumbs;
}
