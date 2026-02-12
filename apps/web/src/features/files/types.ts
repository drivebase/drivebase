export type FileType = "image" | "video" | "audio" | "document" | "other";

export interface File {
	id: string;
	name: string;
	type: FileType;
	provider: "google" | "aws" | "local";
	size: number; // in bytes
	uploadedAt: string;
	shared: "Private" | "Public" | "Family" | "Work";
	url: string; // dummy url or placeholder
	parentId?: string;
}

export interface Folder {
	id: string;
	name: string;
	fileCount: number;
	size: number; // in bytes
	type: "music" | "image" | "video" | "document" | "other"; // for icon logic
	parentId?: string;
	isFavorite?: boolean;
}

export interface StorageStat {
	type: "Media" | "Documents" | "Other Files";
	used: number; // in bytes
	total: number; // in bytes
	color: string; // hex color for progress bar
}
