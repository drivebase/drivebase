import type { Database, Job } from "@drivebase/db";
import { activities, jobs } from "@drivebase/db";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { pubSub } from "../graphql/pubsub";

interface CreateJobInput {
	type: string;
	title: string;
	message?: string;
	metadata?: Record<string, unknown>;
	/**
	 * If true, suppresses the GraphQL subscription event (useful for hidden background jobs).
	 */
	suppressEvent?: boolean;
}

interface UpdateJobInput {
	progress?: number;
	message?: string;
	status?: Job["status"];
	metadata?: Record<string, unknown>;
	/**
	 * If true, metadata will be completely replaced instead of merged.
	 * Defaults to false (merge).
	 */
	replaceMetadata?: boolean;
	/**
	 * If true, suppresses the GraphQL subscription event (useful for hidden child jobs).
	 */
	suppressEvent?: boolean;
}

interface LogActivityInput {
	kind: string;
	title: string;
	summary?: string;
	status?: "info" | "success" | "warning" | "error";
	progress?: number;
	userId: string;
	workspaceId?: string;
	details?: Record<string, unknown>;
	occurredAt?: Date;
}

export class ActivityService {
	constructor(private db: Database) {}

	async create(workspaceId: string, input: CreateJobInput) {
		const [job] = await this.db
			.insert(jobs)
			.values({
				workspaceId,
				type: input.type,
				title: input.title,
				message: input.message ?? null,
				status: "pending",
				progress: 0,
				metadata: input.metadata ?? null,
			})
			.returning();

		if (!job) {
			throw new Error("Failed to create job");
		}

		if (!input.suppressEvent) {
			pubSub.publish("activityUpdated", workspaceId, job);
		}
		return job;
	}

	async update(jobId: string, input: UpdateJobInput) {
		const metadataSet =
			input.metadata !== undefined
				? input.replaceMetadata
					? input.metadata
					: sql`COALESCE(${jobs.metadata}, '{}'::jsonb) || ${input.metadata}::jsonb`
				: undefined;

		const [job] = await this.db
			.update(jobs)
			.set({
				...(input.progress !== undefined && { progress: input.progress }),
				...(input.message !== undefined && { message: input.message }),
				...(input.status !== undefined && { status: input.status }),
				...(metadataSet !== undefined && { metadata: metadataSet }),
				updatedAt: new Date(),
			})
			.where(eq(jobs.id, jobId))
			.returning();

		if (!job) {
			throw new Error("Job not found");
		}

		if (!input.suppressEvent) {
			pubSub.publish("activityUpdated", job.workspaceId, job);
		}
		return job;
	}

	async complete(jobId: string, message?: string) {
		return this.update(jobId, {
			status: "completed",
			progress: 1,
			message: message ?? "Completed",
		});
	}

	async fail(jobId: string, message: string) {
		return this.update(jobId, {
			status: "error",
			message,
		});
	}

	async getActive(workspaceId: string) {
		return this.db
			.select()
			.from(jobs)
			.where(
				and(
					eq(jobs.workspaceId, workspaceId),
					inArray(jobs.status, ["pending", "running"]),
				),
			);
	}

	async getRecentJobs(workspaceId: string, limit = 50, offset = 0) {
		const safeLimit = Math.max(1, Math.min(200, limit));
		const safeOffset = Math.max(0, offset);
		return this.db
			.select()
			.from(jobs)
			.where(eq(jobs.workspaceId, workspaceId))
			.orderBy(desc(jobs.updatedAt), desc(jobs.createdAt))
			.limit(safeLimit)
			.offset(safeOffset);
	}

	async log(input: LogActivityInput) {
		const progress =
			typeof input.progress === "number"
				? Math.max(0, Math.min(1, input.progress))
				: null;
		const maybeProgressColumn =
			progress === null ? {} : ({ progress } as Record<string, number>);
		const [activity] = await this.db
			.insert(activities)
			.values({
				kind: input.kind,
				title: input.title,
				summary: input.summary ?? null,
				status: input.status ?? null,
				...maybeProgressColumn,
				userId: input.userId,
				workspaceId: input.workspaceId ?? null,
				details: input.details ?? null,
				occurredAt: input.occurredAt ?? new Date(),
			})
			.returning();

		if (!activity) {
			throw new Error("Failed to log activity");
		}

		pubSub.publish("activityCreated", input.userId, activity);
		return activity;
	}

	async getRecentForUser(userId: string, page = 1, limit = 25) {
		const safeLimit = Math.max(1, Math.min(100, limit));
		const safePage = Math.max(1, page);
		const offset = (safePage - 1) * safeLimit;

		const [nodes, [countRow]] = await Promise.all([
			this.db
				.select()
				.from(activities)
				.where(eq(activities.userId, userId))
				.orderBy(desc(activities.occurredAt), desc(activities.createdAt))
				.limit(safeLimit)
				.offset(offset),
			this.db
				.select({ total: count() })
				.from(activities)
				.where(eq(activities.userId, userId)),
		]);

		const total = countRow?.total ?? 0;
		const totalPages = Math.max(1, Math.ceil(total / safeLimit));

		return {
			nodes,
			meta: {
				total,
				page: safePage,
				limit: safeLimit,
				totalPages,
				hasNextPage: safePage < totalPages,
				hasPreviousPage: safePage > 1,
			},
		};
	}

	async deleteForUser(userId: string, ids: string[]) {
		if (ids.length === 0) return 0;
		const result = await this.db
			.delete(activities)
			.where(and(eq(activities.userId, userId), inArray(activities.id, ids)));
		return result.rowCount ?? 0;
	}
}
