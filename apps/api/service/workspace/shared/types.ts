import type { Database } from "@drivebase/db";
import type { WorkspaceRole } from "../rbac";

export type WorkspaceDbLike = Pick<Database, "insert" | "select">;
export type WorkspaceUpdateDbLike = Pick<Database, "update">;

export type WorkspaceMemberRow = {
	userId: string;
	name: string;
	email: string;
	role: WorkspaceRole;
	joinedAt: Date;
	isOwner: boolean;
};

export type WorkspaceInviteRow = {
	id: string;
	token: string;
	role: WorkspaceRole;
	expiresAt: Date;
	createdAt: Date;
};
