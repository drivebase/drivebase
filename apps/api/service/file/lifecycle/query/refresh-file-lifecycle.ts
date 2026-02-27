import { ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { ProviderService } from "../../../provider";
import { getFile } from "../../query/file-read";
import { mapProviderLifecycleState, toLifecycleView } from "../shared/mapping";

export async function refreshFileLifecycle(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	const file = await getFile(db, fileId, userId, workspaceId);
	const providerService = new ProviderService(db);
	const providerRecord = await providerService.getProvider(
		file.providerId,
		userId,
		workspaceId,
	);
	const provider = await providerService.getProviderInstance(providerRecord);
	try {
		if (!provider.getLifecycleState) {
			throw new ValidationError(
				"Provider does not support lifecycle operations",
			);
		}

		const lifecycle = await provider.getLifecycleState(file.remoteId);
		const mapped = mapProviderLifecycleState(lifecycle);
		const [updated] = await db
			.update(files)
			.set({
				lifecycleState: mapped.lifecycleState,
				storageClass: mapped.storageClass,
				restoreRequestedAt: mapped.restoreRequestedAt,
				restoreExpiresAt: mapped.restoreExpiresAt,
				lifecycleCheckedAt: mapped.lifecycleCheckedAt,
				updatedAt: new Date(),
			})
			.where(eq(files.id, file.id))
			.returning();

		if (!updated) {
			throw new Error("Failed to refresh lifecycle state");
		}

		return toLifecycleView({
			lifecycleState: updated.lifecycleState,
			storageClass: updated.storageClass,
			restoreRequestedAt: updated.restoreRequestedAt,
			restoreExpiresAt: updated.restoreExpiresAt,
			lifecycleCheckedAt: updated.lifecycleCheckedAt,
		});
	} finally {
		await provider.cleanup();
	}
}
