export interface FileItem {
	id: string;
	name: string;
	subtitle?: string;
	size: string;
	kind: string;
	modified: string;
	icon: "image" | "pdf" | "document" | "video" | "folder" | "archive";
}

export interface FolderItem {
	id: string;
	name: string;
	meta: string;
	badge?: string;
}

export interface SidebarSource {
	id: string;
	label: string;
	icon: "files" | "google-drive" | "dropbox" | "local" | "trash";
}

export type FileViewTab = "recent" | "shared" | "starred";
export type FileManagerLocation = SidebarSource["id"] | FileViewTab;
