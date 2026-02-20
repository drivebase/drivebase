import type { Database } from "@drivebase/db";
import {
	type FileAttributes,
	type FileRule,
	fileRules,
	matchesRule,
	storageProviders,
} from "@drivebase/db";
import { and, asc, eq } from "drizzle-orm";
import { logger } from "../../utils/logger";

export type { FileAttributes };

/**
 * Evaluate all enabled rules for a workspace and return the first matching rule.
 * Rules are evaluated in priority order (lower number = higher priority).
 */
export async function evaluateRules(
	db: Database,
	workspaceId: string,
	file: FileAttributes,
): Promise<FileRule | null> {
	const rules = await db
		.select({ rule: fileRules, providerActive: storageProviders.isActive })
		.from(fileRules)
		.innerJoin(
			storageProviders,
			eq(fileRules.destinationProviderId, storageProviders.id),
		)
		.where(
			and(
				eq(fileRules.workspaceId, workspaceId),
				eq(fileRules.enabled, true),
				eq(fileRules.isDeleted, false),
			),
		)
		.orderBy(asc(fileRules.priority));

	for (const { rule, providerActive } of rules) {
		if (!providerActive) {
			continue;
		}

		if (matchesRule(rule.conditions, file)) {
			logger.debug({
				msg: "File matched rule",
				ruleName: rule.name,
				ruleId: rule.id,
				fileName: file.name,
			});
			return rule;
		}
	}

	return null;
}
