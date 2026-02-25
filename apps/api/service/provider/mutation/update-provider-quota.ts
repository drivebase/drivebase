import { NotFoundError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

// Update provider quota numbers with validation.
export async function updateProviderQuota(
	db: Database,
	providerId: string,
	workspaceId: string,
	quotaTotal: number | null,
	quotaUsed: number,
) {
	const [providerRecord] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, providerId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!providerRecord) throw new NotFoundError("Provider");
	if (quotaUsed < 0) throw new ValidationError("quotaUsed must be >= 0");
	if (quotaTotal !== null && quotaTotal < 0) {
		throw new ValidationError("quotaTotal must be >= 0");
	}
	if (quotaTotal !== null && quotaUsed > quotaTotal) {
		throw new ValidationError("quotaUsed cannot exceed quotaTotal");
	}

	const [updated] = await db
		.update(storageProviders)
		.set({ quotaTotal: quotaTotal ?? null, quotaUsed, updatedAt: new Date() })
		.where(eq(storageProviders.id, providerId))
		.returning();

	if (!updated) throw new Error("Failed to update provider quota");
	return updated;
}
