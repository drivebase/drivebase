import {
	PiDownload as Download,
	PiEye as Eye,
	PiInfo as Info,
	PiPencilSimple as Pencil,
	PiShareNetwork as Share,
	PiStar as Star,
} from "react-icons/pi";
import type { FileItemFragment } from "@/gql/graphql";
import type { FileAction, SelectionItem } from "./types";

function singleFile(selection: SelectionItem[]): FileItemFragment | undefined {
	if (selection.length !== 1 || selection[0].kind !== "file") return undefined;
	return selection[0].data as FileItemFragment;
}

export interface FileActionDeps {
	downloadFile: (file: FileItemFragment) => Promise<void>;
	showDetails: (file: FileItemFragment) => void;
	createDownloadLink: (file: FileItemFragment) => Promise<void>;
	renameFile: (file: FileItemFragment) => Promise<void>;
	toggleFileFavorite: (file: FileItemFragment) => Promise<void>;
	canWrite: boolean;
}

export function createFileActions(deps: FileActionDeps): FileAction[] {
	return [
		{
			id: "view-details",
			label: "View Details",
			icon: Info,
			group: "quick",
			surfaces: ["contextMenu"],
			enabled: (ctx) => !!singleFile(ctx.selection),
			execute: (ctx) => {
				const file = singleFile(ctx.selection);
				if (file) deps.showDetails(file);
			},
		},
		{
			id: "download",
			label: "Download",
			icon: Download,
			shortcut: "Ctrl+D",
			group: "quick",
			surfaces: ["contextMenu", "keyboard"],
			enabled: (ctx) => !!singleFile(ctx.selection),
			execute: async (ctx) => {
				const file = singleFile(ctx.selection);
				if (file) await deps.downloadFile(file);
			},
		},
		{
			id: "preview",
			label: "Preview",
			icon: Eye,
			group: "quick",
			surfaces: ["contextMenu"],
			enabled: (ctx) => !!singleFile(ctx.selection),
			execute: (ctx) => {
				const file = singleFile(ctx.selection);
				if (file) deps.showDetails(file);
			},
		},
		{
			id: "rename-file",
			label: "Rename",
			icon: Pencil,
			shortcut: "F2",
			group: "organize",
			surfaces: ["contextMenu", "keyboard"],
			enabled: (ctx) => deps.canWrite && !!singleFile(ctx.selection),
			execute: async (ctx) => {
				const file = singleFile(ctx.selection);
				if (file) await deps.renameFile(file);
			},
		},
		{
			id: "create-download-link",
			label: "Create download link",
			icon: Share,
			group: "library",
			surfaces: ["contextMenu"],
			enabled: (ctx) => deps.canWrite && !!singleFile(ctx.selection),
			execute: async (ctx) => {
				const file = singleFile(ctx.selection);
				if (file) await deps.createDownloadLink(file);
			},
		},
		{
			id: "toggle-file-favorite",
			label: "Toggle Starred",
			icon: Star,
			group: "library",
			surfaces: ["contextMenu"],
			enabled: (ctx) => deps.canWrite && !!singleFile(ctx.selection),
			execute: async (ctx) => {
				const file = singleFile(ctx.selection);
				if (file) await deps.toggleFileFavorite(file);
			},
		},
	];
}
