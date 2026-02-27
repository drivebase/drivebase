import type { Database } from "@drivebase/db";
import { toLifecycleView } from "../shared/mapping";
import { getFile } from "../../query/file-read";

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
