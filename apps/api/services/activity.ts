import type { Database } from "@drivebase/db";
import { jobs } from "@drivebase/db";
import { and, eq, inArray } from "drizzle-orm";
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
}
