import { ActivityService } from "../../services/activity";
import { ValidationError } from "@drivebase/core";
import {
	files,
	folders,
	jobs,
	storageProviders,
	type Activity as DbActivity,
	type Job as DbJob,
	users,
} from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import {
	buildTransferQueueJobId,
	getTransferQueue,
} from "../../queue/transfer-queue";
import { getRedis } from "../../redis/client";
import { getAccessibleWorkspaceId } from "../../services/workspace/workspace";
import {
	JobStatus,
	type ActivityResolvers,
	ActivityType,
	type Job,
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

function toGraphqlJob(job: DbJob): Job {
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

function toActivityType(type: DbActivity["type"]): ActivityType {
	if (type === "upload") return ActivityType.Upload;
	if (type === "download") return ActivityType.Download;
	if (type === "create") return ActivityType.Create;
	if (type === "update") return ActivityType.Update;
	if (type === "delete") return ActivityType.Delete;
	if (type === "move") return ActivityType.Move;
	if (type === "copy") return ActivityType.Copy;
	if (type === "share") return ActivityType.Share;
	return ActivityType.Unshare;
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
};

export const activityResolvers: ActivityResolvers = {
	type: (parent) => toActivityType(parent.type),
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
	file: async (parent, _args, context) => {
		if (!parent.fileId) return null;
		const [file] = await context.db
			.select()
			.from(files)
			.where(eq(files.id, parent.fileId))
			.limit(1);
		return file ?? null;
	},
	folder: async (parent, _args, context) => {
		if (!parent.folderId) return null;
		const [folder] = await context.db
			.select()
			.from(folders)
			.where(eq(folders.id, parent.folderId))
			.limit(1);
		return folder ?? null;
	},
	provider: async (parent, _args, context) => {
		if (!parent.providerId) return null;
		const [provider] = await context.db
			.select()
			.from(storageProviders)
			.where(eq(storageProviders.id, parent.providerId))
			.limit(1);
		return provider ?? null;
	},
};

function getTransferCancelKey(jobId: string): string {
	return `transfer:cancel:${jobId}`;
}

export const activityMutations: MutationResolvers = {
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
};
