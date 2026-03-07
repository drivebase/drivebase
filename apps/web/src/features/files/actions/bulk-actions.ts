import { PiTrash as Trash } from "react-icons/pi";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import type { FileAction } from "./types";

export interface BulkActionDeps {
	deleteSelection: (selection: {
		files: FileItemFragment[];
		folders: FolderItemFragment[];
	}) => Promise<void>;
	canWrite: boolean;
}

export function createBulkActions(deps: BulkActionDeps): FileAction[] {
	return [
		{
			id: "delete",
			label: "Delete",
			icon: Trash,
			shortcut: "Del",
			group: "danger",
			variant: "destructive",
			surfaces: ["contextMenu", "toolbar", "keyboard"],
			enabled: (ctx) => deps.canWrite && ctx.selection.length > 0,
			execute: async (ctx) => {
				const files = ctx.selection
					.filter((i) => i.kind === "file")
					.map((i) => i.data as FileItemFragment);
				const folders = ctx.selection
					.filter((i) => i.kind === "folder")
					.map((i) => i.data as FolderItemFragment);

				const total = files.length + folders.length;
				const confirmed = await confirmDialog(
					"Delete Selected Items",
					`Delete ${total} selected item(s)? This action cannot be undone.`,
				);
				if (!confirmed) return;

				await deps.deleteSelection({ files, folders });
			},
		},
	];
}
