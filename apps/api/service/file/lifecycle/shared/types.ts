import type { files } from "@drivebase/db";

export type FileLifecycleState =
	| "hot"
	| "archived"
	| "restore_requested"
	| "restoring"
	| "restored_temporary"
	| "unknown";

export type RestoreTier = "fast" | "standard" | "bulk";

export interface FileLifecycleView {
	state: FileLifecycleState;
	storageClass: string | null;
	restoreRequestedAt: Date | null;
	restoreExpiresAt: Date | null;
	lastCheckedAt: Date | null;
}

export type FileRecord = typeof files.$inferSelect;
