import {
	PiFolder as FolderIcon,
	PiPencilSimple as Pencil,
	PiStar as Star,
} from "react-icons/pi";
import type { FolderItemFragment } from "@/gql/graphql";
import type { FileAction, SelectionItem } from "./types";

function singleFolder(
	selection: SelectionItem[],
): FolderItemFragment | undefined {
	if (selection.length !== 1 || selection[0].kind !== "folder")
		return undefined;
	return selection[0].data as FolderItemFragment;
}

export interface FolderActionDeps {
	renameFolder: (folder: FolderItemFragment) => Promise<void>;
	toggleFolderFavorite: (folder: FolderItemFragment) => Promise<void>;
	canWrite: boolean;
}

export function createFolderActions(deps: FolderActionDeps): FileAction[] {
	return [
		{
			id: "open-folder",
			label: "Open",
			icon: FolderIcon,
			group: "quick",
			surfaces: ["contextMenu"],
			enabled: (ctx) => !!singleFolder(ctx.selection),
			execute: (ctx) => {
				const folder = singleFolder(ctx.selection);
				if (folder) ctx.navigate(folder.id);
			},
		},
		{
			id: "rename-folder",
			label: "Rename",
			icon: Pencil,
			shortcut: "F2",
			group: "organize",
			surfaces: ["contextMenu", "keyboard"],
			enabled: (ctx) => deps.canWrite && !!singleFolder(ctx.selection),
			execute: async (ctx) => {
				const folder = singleFolder(ctx.selection);
				if (folder) await deps.renameFolder(folder);
			},
		},
		{
			id: "toggle-folder-favorite",
			label: "Toggle Starred",
			icon: Star,
			group: "library",
			surfaces: ["contextMenu"],
			enabled: (ctx) => deps.canWrite && !!singleFolder(ctx.selection),
			execute: async (ctx) => {
				const folder = singleFolder(ctx.selection);
				if (folder) await deps.toggleFolderFavorite(folder);
			},
		},
	];
}
