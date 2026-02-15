import { useMemo } from "react";
import type { FolderItemFragment } from "@/gql/graphql";

interface BreadcrumbItem {
	name: string;
	path: string;
	folderId: string | null;
}

export function useBreadcrumbs(
	currentPath: string,
	currentFolder: FolderItemFragment | undefined,
) {
	const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
		if (currentPath === "/") return [];
		const parts = currentPath.split("/").filter(Boolean);
		return parts.map((part, index) => ({
			name: part,
			path: `/${parts.slice(0, index + 1).join("/")}`,
			folderId:
				index === parts.length - 1
					? (currentFolder?.id ?? null)
					: index === parts.length - 2
						? (currentFolder?.parentId ?? null)
						: null,
		}));
	}, [currentPath, currentFolder?.id, currentFolder?.parentId]);

	return breadcrumbs;
}
