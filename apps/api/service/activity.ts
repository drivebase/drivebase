import type { Database } from "@drivebase/db";
import { activities, jobs, workspaceStats } from "@drivebase/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { pubSub } from "../graphql/pubsub";

interface CreateJobInput {
	type: string;
	title: string;
	message?: string;
	metadata?: Record<string, unknown>;
}

interface UpdateJobInput {
	progress?: number;
	message?: string;
	status?: "pending" | "running" | "completed" | "error";
	metadata?: Record<string, unknown>;
}

interface LogActivityInput {
	type:
		| "upload"
		| "download"
		| "create"
		| "update"
		| "delete"
		| "move"
		| "copy"
		| "share"
		| "unshare";
	userId: string;
	fileId?: string;
	folderId?: string;
	providerId?: string;
	workspaceId?: string;
	bytes?: number;
	metadata?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
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

		pubSub.publish("activityUpdated", workspaceId, job);
		return job;
	}

	async update(jobId: string, input: UpdateJobInput) {
		const [job] = await this.db
			.update(jobs)
			.set({
				...(input.progress !== undefined && { progress: input.progress }),
				...(input.message !== undefined && { message: input.message }),
				...(input.status !== undefined && { status: input.status }),
				...(input.metadata !== undefined && { metadata: input.metadata }),
				updatedAt: new Date(),
			})
			.where(eq(jobs.id, jobId))
			.returning();

		if (!job) {
			throw new Error("Job not found");
		}

		pubSub.publish("activityUpdated", job.workspaceId, job);
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

	async log(input: LogActivityInput) {
		const bytes = Math.max(0, input.bytes ?? 0);
		const [activity] = await this.db
			.insert(activities)
			.values({
				type: input.type,
				userId: input.userId,
				fileId: input.fileId ?? null,
				folderId: input.folderId ?? null,
				providerId: input.providerId ?? null,
				workspaceId: input.workspaceId ?? null,
				bytes,
				metadata: input.metadata ?? null,
				ipAddress: input.ipAddress ?? null,
				userAgent: input.userAgent ?? null,
			})
			.returning();

		if (!activity) {
			throw new Error("Failed to log activity");
		}

		if (
			input.workspaceId &&
			bytes > 0 &&
			(input.type === "upload" || input.type === "download")
		) {
			const now = new Date();
			const bucketStart = new Date(
				Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
			);
			await this.db
				.insert(workspaceStats)
				.values({
					workspaceId: input.workspaceId,
					bucketStart,
					uploadedBytes: input.type === "upload" ? bytes : 0,
					downloadedBytes: input.type === "download" ? bytes : 0,
				})
				.onConflictDoUpdate({
					target: [workspaceStats.workspaceId, workspaceStats.bucketStart],
					set:
						input.type === "upload"
							? {
									uploadedBytes: sql`${workspaceStats.uploadedBytes} + ${bytes}`,
									updatedAt: now,
								}
							: {
									downloadedBytes: sql`${workspaceStats.downloadedBytes} + ${bytes}`,
									updatedAt: now,
								},
				});
		}

		pubSub.publish("activityCreated", input.userId, activity);
		return activity;
	}

	async getRecentForUser(userId: string, limit = 5, offset = 0) {
		const safeLimit = Math.max(1, Math.min(50, limit));
		const safeOffset = Math.max(0, offset);
		return this.db
			.select()
			.from(activities)
			.where(eq(activities.userId, userId))
			.orderBy(desc(activities.createdAt))
			.limit(safeLimit)
			.offset(safeOffset);
	}

	async deleteForUser(userId: string, ids: string[]) {
		if (ids.length === 0) return 0;
		const result = await this.db
			.delete(activities)
			.where(and(eq(activities.userId, userId), inArray(activities.id, ids)));
		return result.rowCount ?? 0;
	}
}
