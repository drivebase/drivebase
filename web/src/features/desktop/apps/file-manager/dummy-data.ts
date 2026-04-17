import type { FileItem, FolderItem, SidebarSource } from "./types";

export const SIDEBAR_SOURCES: SidebarSource[] = [
	{ id: "google-drive", label: "Google Drive", icon: "google-drive" },
	{ id: "dropbox", label: "Dropbox", icon: "dropbox" },
	{ id: "local", label: "Local Storage", icon: "local" },
];

export const DUMMY_FOLDERS: FolderItem[] = [
	{
		id: "1",
		name: "Brand Guidelines 2024",
		meta: "124 files \u2022 Updated 2h ago",
		badge: "ACTIVE PROJECT",
	},
	{
		id: "2",
		name: "Legacy Assets",
		meta: "450MB \u2022 Created 2023",
	},
];

export const DUMMY_FILES: FileItem[] = [
	{
		id: "1",
		name: "hero_v2_final.png",
		subtitle: "Shared with 3 others",
		size: "4.2 MB",
		kind: "PNG Image",
		modified: "Today, 10:45 AM",
		icon: "image",
	},
	{
		id: "2",
		name: "project_contract.pdf",
		subtitle: "Internal Only",
		size: "1.1 MB",
		kind: "PDF Document",
		modified: "Yesterday",
		icon: "pdf",
	},
	{
		id: "3",
		name: "notes_session.docx",
		subtitle: "Last viewed 1h ago",
		size: "24 KB",
		kind: "Word Doc",
		modified: "Sep 12, 2024",
		icon: "document",
	},
	{
		id: "4",
		name: "presentation_render.mp4",
		subtitle: "High Quality",
		size: "245.8 MB",
		kind: "MPEG-4 Video",
		modified: "Aug 28, 2024",
		icon: "video",
	},
];

export const DUMMY_BREADCRUMB = ["Google Drive", "Q4 Projects", "Design Assets"];
