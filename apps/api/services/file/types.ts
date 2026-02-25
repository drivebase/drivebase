import { files, folders } from "@drivebase/db";

export type FileRecord = typeof files.$inferSelect;
export type FolderRecord = typeof folders.$inferSelect;

export interface ContentsResult {
	files: FileRecord[];
	folders: FolderRecord[];
	folder: FolderRecord | null;
}
