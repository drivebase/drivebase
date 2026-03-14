import {
	PiCopy as Copy,
	PiScissors as Cut,
	PiClipboardText as Paste,
	PiTrash as Trash,
} from "react-icons/pi";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import type { FileAction } from "./types";
import type {
	ClipboardItemRef,
	ClipboardOperation,
} from "../store/clipboardStore";

export interface BulkActionDeps {
	deleteSelection: (selection: {
		files: FileItemFragment[];
		folders: FolderItemFragment[];
	}) => Promise<void>;
	stageClipboard: (mode: ClipboardOperation, items: ClipboardItemRef[]) => void;
	pasteSelection: (targetFolderId: string | null) => Promise<void>;
	canWrite: boolean;
}

export function createBulkActions(deps: BulkActionDeps): FileAction[] {
	return [
		{
			id: "cut-selection",
			label: "Cut",
			icon: Cut,
			group: "organize",
			surfaces: ["contextMenu"],
			enabled: (ctx) => deps.canWrite && ctx.selection.length > 0,
			execute: (ctx) => {
				deps.stageClipboard(
					"cut",
					ctx.selection.map((item) => ({ kind: item.kind, id: item.data.id })),
				);
				ctx.clearSelection();
			},
		},
		{
			id: "copy-selection",
			label: "Copy",
			icon: Copy,
			group: "organize",
			surfaces: ["contextMenu"],
			enabled: (ctx) => deps.canWrite && ctx.selection.length > 0,
			execute: (ctx) => {
				deps.stageClipboard(
					"copy",
					ctx.selection.map((item) => ({ kind: item.kind, id: item.data.id })),
				);
				ctx.clearSelection();
			},
		},
		{
			id: "paste-selection",
			label: (ctx) => {
				if (ctx.selection.length === 1 && ctx.selection[0].kind === "folder") {
					return `Paste in "${ctx.selection[0].data.name}"`;
				}
				if (ctx.currentFolderName) {
					return `Paste in "${ctx.currentFolderName}"`;
				}
				return "Paste in Root";
			},
			icon: Paste,
			group: "organize",
			surfaces: ["contextMenu", "toolbar"],
			enabled: (ctx) =>
				deps.canWrite &&
				ctx.clipboard.count > 0 &&
				(ctx.selection.length === 0 ||
					(ctx.selection.length === 1 && ctx.selection[0].kind === "folder")),
			execute: async (ctx) => {
				const targetFolderId =
					ctx.selection.length === 1 && ctx.selection[0].kind === "folder"
						? ctx.selection[0].data.id
						: (ctx.currentFolderId ?? null);
				await deps.pasteSelection(targetFolderId);
			},
		},
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
