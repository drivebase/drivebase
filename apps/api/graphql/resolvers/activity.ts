import { ValidationError } from "@drivebase/core";
import { type Job as DbJob, jobs, users } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import {
	buildTransferQueueJobId,
	getTransferQueue,
} from "../../queue/transfer-queue";
import { getRedis } from "../../redis/client";
import { ActivityService } from "../../service/activity";
import { getAccessibleWorkspaceId } from "../../service/workspace";
import {
	type ActivityResolvers,
	type Job,
	JobStatus,
	type MutationResolvers,
	type QueryResolvers,
	type SubscriptionResolvers,
} from "../generated/types";
import { type PubSubChannels, pubSub } from "../pubsub";
import { requireAuth } from "./auth-helpers";

function toJobStatus(status: DbJob["status"]): JobStatus {
	if (status === "pending") return JobStatus.Pending;
	if (status === "running") return JobStatus.Running;
	if (status === "completed") return JobStatus.Completed;
	return JobStatus.Error;
}

export function toGraphqlJob(job: DbJob): Job {
	return {
		id: job.id,
		type: job.type,
		title: job.title,
		message: job.message,
		progress: job.progress,
		status: toJobStatus(job.status),
		metadata: job.metadata,
		createdAt: job.createdAt,
		updatedAt: job.updatedAt,
	};
}

export const activityQueries: QueryResolvers = {
	activities: async (_parent, args, context) => {
		const user = requireAuth(context);
		const activityService = new ActivityService(context.db);
		return activityService.getRecentForUser(
			user.userId,
			args.limit ?? undefined,
			args.offset ?? undefined,
		);
	},
	activeJobs: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const workspaceId = await getAccessibleWorkspaceId(
			context.db,
			user.userId,
			context.headers?.get("x-workspace-id") ?? undefined,
		);
		const activityService = new ActivityService(context.db);
		const jobs = await activityService.getActive(workspaceId);
		return jobs.map(toGraphqlJob);
	},
	recentJobs: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspaceId = await getAccessibleWorkspaceId(
			context.db,
			user.userId,
			context.headers?.get("x-workspace-id") ?? undefined,
		);
		const activityService = new ActivityService(context.db);
		const jobs = await activityService.getRecentJobs(
			workspaceId,
			args.limit ?? undefined,
			args.offset ?? undefined,
		);
		return jobs.map(toGraphqlJob);
	},
};

export const activityResolvers: ActivityResolvers = {
	user: async (parent, _args, context) => {
		const [user] = await context.db
			.select()
			.from(users)
			.where(eq(users.id, parent.userId))
			.limit(1);
		if (!user) {
			throw new ValidationError("User not found for activity");
		}
		return user;
	},
};

function getTransferCancelKey(jobId: string): string {
	return `transfer:cancel:${jobId}`;
}

export const activityMutations: MutationResolvers = {
	clearActivities: async (_parent, args, context) => {
		const user = requireAuth(context);
		const activityService = new ActivityService(context.db);
		return activityService.deleteForUser(user.userId, args.ids);
	},
	cancelTransferJob: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspaceId = await getAccessibleWorkspaceId(
			context.db,
			user.userId,
			context.headers?.get("x-workspace-id") ?? undefined,
		);
		const activityService = new ActivityService(context.db);

		const [job] = await context.db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, args.jobId), eq(jobs.workspaceId, workspaceId)))
			.limit(1);

		if (!job) {
			throw new ValidationError("Job not found");
		}

		if (job.type !== "provider_transfer") {
			throw new ValidationError("Only provider transfer jobs can be cancelled");
		}

		if (job.status === "completed") {
			throw new ValidationError("Job is already completed");
		}

		const fileId =
			typeof job.metadata?.fileId === "string" ? job.metadata.fileId : null;
		const targetProviderId =
			typeof job.metadata?.targetProviderId === "string"
				? job.metadata.targetProviderId
				: null;

		if (!fileId || !targetProviderId) {
			throw new ValidationError("Transfer metadata not found");
		}

		const transferQueue = getTransferQueue();
		const transferQueueJobId = buildTransferQueueJobId(
			fileId,
			targetProviderId,
		);
		const queueJob = await transferQueue.getJob(transferQueueJobId);
		const queueState = queueJob ? await queueJob.getState() : null;
		const redis = getRedis();
		await redis.set(getTransferCancelKey(job.id), "1", "EX", 24 * 60 * 60);

		if (
			queueJob &&
			(queueState === "waiting" ||
				queueState === "delayed" ||
				queueState === "prioritized")
		) {
			await queueJob.remove();
			await activityService.update(job.id, {
				status: "error",
				message: "Transfer cancelled",
				metadata: {
					...(job.metadata ?? {}),
					phase: "cancelled",
					cancelled: true,
				},
			});
			return true;
		}

		await activityService.update(job.id, {
			status: "error",
			message: "Transfer cancellation requested",
			metadata: {
				...(job.metadata ?? {}),
				phase: "cancelling",
				cancelled: true,
			},
		});
		return true;
	},
};

export const activitySubscriptions: SubscriptionResolvers = {
	jobUpdated: {
		subscribe: async (_parent, _args, context) => {
			const user = requireAuth(context);
			const workspaceId = await getAccessibleWorkspaceId(
				context.db,
				user.userId,
				context.headers?.get("x-workspace-id") ?? undefined,
			);
			return pubSub.subscribe("activityUpdated", workspaceId);
		},
		resolve: (payload: PubSubChannels["activityUpdated"][1]) =>
			toGraphqlJob(payload),
	},
	activityCreated: {
		subscribe: async (_parent, _args, context) => {
			const user = requireAuth(context);
			return pubSub.subscribe("activityCreated", user.userId);
		},
		resolve: (payload: PubSubChannels["activityCreated"][1]) => payload,
	},
};
