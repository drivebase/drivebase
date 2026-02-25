import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { telemetry } from "@/telemetry";

// Delete a provider from workspace.
export async function disconnectProvider(
	db: Database,
	providerId: string,
	workspaceId: string,
) {
	const [provider] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, providerId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!provider) throw new NotFoundError("Provider");
	await db.delete(storageProviders).where(eq(storageProviders.id, providerId));
	telemetry.capture("provider_disconnected", { type: provider.type });
}
