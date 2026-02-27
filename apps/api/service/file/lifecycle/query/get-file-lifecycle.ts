import type { Database } from "@drivebase/db";
import { getFile } from "../../query/file-read";
import { toLifecycleView } from "../shared/mapping";

export async function getFileLifecycle(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	const file = await getFile(db, fileId, userId, workspaceId);
	return toLifecycleView({
		lifecycleState: file.lifecycleState,
		storageClass: file.storageClass,
		restoreRequestedAt: file.restoreRequestedAt,
		restoreExpiresAt: file.restoreExpiresAt,
		lifecycleCheckedAt: file.lifecycleCheckedAt,
	});
}
