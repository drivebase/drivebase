import { NotFoundError, ValidationError } from "@drivebase/core";
import {
	type Database,
	storageProviders,
	workspaceAutoSyncProviders,
	workspaces,
} from "@drivebase/db";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import {
	removeWorkspaceAutoSyncSchedule,
	upsertWorkspaceAutoSyncSchedule,
} from "@/queue/sync-queue";
import { validateCronExpression } from "@/utils/cron";
import { normalizeIds } from "@/utils/id";

export type UpdateWorkspaceAutoSyncInput = {
	workspaceId: string;
	enabled: boolean;
	cron: string | null | undefined;
	scope: "all" | "selected";
	providerIds?: readonly string[] | null;
};

export async function updateWorkspaceAutoSync(
	db: Database,
	input: UpdateWorkspaceAutoSyncInput,
) {
	const selectedProviderIds = normalizeIds(input.providerIds);
	const normalizedCron = input.enabled
		? validateCronExpression(input.cron ?? "")
		: input.cron?.trim() || null;

	if (
		input.enabled &&
		input.scope === "selected" &&
		selectedProviderIds.length === 0
	) {
		throw new ValidationError(
			"At least one provider must be selected when scope is SELECTED",
		);
	}

	const [workspace] = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(eq(workspaces.id, input.workspaceId))
		.limit(1);

	if (!workspace) {
		throw new NotFoundError("Workspace", { workspaceId: input.workspaceId });
	}

	if (input.scope === "selected" && selectedProviderIds.length > 0) {
		const providerRows = await db
			.select({ id: storageProviders.id })
			.from(storageProviders)
			.where(
				and(
					eq(storageProviders.workspaceId, input.workspaceId),
					eq(storageProviders.isActive, true),
					inArray(storageProviders.id, selectedProviderIds),
				),
			);

		if (providerRows.length !== selectedProviderIds.length) {
			throw new ValidationError(
				"One or more selected providers are invalid for this workspace",
			);
		}
	}

	const [updatedWorkspace] = await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(workspaces)
			.set({
				autoSyncEnabled: input.enabled,
				autoSyncCron: input.enabled ? normalizedCron : null,
				autoSyncScope: input.scope,
				updatedAt: new Date(),
			})
			.where(eq(workspaces.id, input.workspaceId))
			.returning();

		if (!updated) {
			throw new NotFoundError("Workspace", { workspaceId: input.workspaceId });
		}

		await tx
			.delete(workspaceAutoSyncProviders)
			.where(eq(workspaceAutoSyncProviders.workspaceId, input.workspaceId));

		if (input.scope === "selected" && selectedProviderIds.length > 0) {
			await tx.insert(workspaceAutoSyncProviders).values(
				selectedProviderIds.map((providerId) => ({
					workspaceId: input.workspaceId,
					providerId,
				})),
			);
		}

		return [updated] as const;
	});

	if (updatedWorkspace.autoSyncEnabled && updatedWorkspace.autoSyncCron) {
		await upsertWorkspaceAutoSyncSchedule(
			updatedWorkspace.id,
			updatedWorkspace.autoSyncCron,
		);
	} else {
		await removeWorkspaceAutoSyncSchedule(updatedWorkspace.id);
	}

	return updatedWorkspace;
}

export async function reconcileWorkspaceAutoSyncSchedules(db: Database) {
	await removeWorkspaceAutoSyncSchedule();

	const rows = await db
		.select({ id: workspaces.id, autoSyncCron: workspaces.autoSyncCron })
		.from(workspaces)
		.where(
			and(
				eq(workspaces.autoSyncEnabled, true),
				isNotNull(workspaces.autoSyncCron),
			),
		);

	for (const row of rows) {
		if (!row.autoSyncCron) continue;
		await upsertWorkspaceAutoSyncSchedule(row.id, row.autoSyncCron);
	}
}
