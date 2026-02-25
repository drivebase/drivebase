import { NotFoundError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

// Rename a provider display name.
export async function renameProvider(
	db: Database,
	providerId: string,
	workspaceId: string,
	name: string,
) {
	const normalizedName = name.trim();
	if (!normalizedName) throw new ValidationError("Provider name is required");

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

	const [updated] = await db
		.update(storageProviders)
		.set({ name: normalizedName, updatedAt: new Date() })
		.where(eq(storageProviders.id, providerId))
		.returning();

	if (!updated) throw new Error("Failed to rename provider");
	return updated;
}
