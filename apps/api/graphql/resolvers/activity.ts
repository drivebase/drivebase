import { ValidationError } from "@drivebase/core";
import { getDb, type Job as DbJob, jobs, users } from "@drivebase/db";
import { and, eq, inArray } from "drizzle-orm";
import { Tokens } from "../../container";
import { getExtractionQueue } from "@/queue/extraction/queue";
import {
	buildTransferQueueJobId,
	getTransferQueue,
} from "@/queue/transfer/queue";
import type { ActivityService } from "../../service/activity";
import { getAccessibleWorkspaceId } from "../../service/workspace";
import { requestJobCancellation } from "../../utils/jobs/job-cancel";
import {
	type ActivityResolvers,
	type Job,
	JobStatus,
	type MutationResolvers,
	type QueryResolvers,
	type SubscriptionResolvers,
} from "../generated/types";
import { type PubSubChannels, pubSub } from "../pubsub";

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
		const activityService = context.container.resolve<ActivityService>(
			Tokens.ActivityService,
		);
		return activityService.getRecentForUser(
			context.user!.userId,
			args.page ?? undefined,
			args.limit ?? undefined,
		);
	},
	activeJobs: async (_parent, _args, context) => {
		const workspaceId = await getAccessibleWorkspaceId(
			context.db,
			context.user!.userId,
			context.headers?.get("x-workspace-id") ?? undefined,
		);
		const activityService = context.container.resolve<ActivityService>(
			Tokens.ActivityService,
		);
		const jobs = await activityService.getActive(workspaceId);
		return jobs.map(toGraphqlJob);
	},
	recentJobs: async (_parent, args, context) => {
		const workspaceId = await getAccessibleWorkspaceId(
			context.db,
			context.user!.userId,
			context.headers?.get("x-workspace-id") ?? undefined,
		);
		const activityService = context.container.resolve<ActivityService>(
			Tokens.ActivityService,
		);
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

/** Job types that support cancellation and their queue lookup logic. */
const CANCELLABLE_JOB_TYPES = new Set([
	"provider_transfer",
	"smart-search-indexing",
]);

export const activityMutations: MutationResolvers = {
	clearActivities: async (_parent, args, context) => {
		const activityService = context.container.resolve<ActivityService>(
			Tokens.ActivityService,
		);
		return activityService.deleteForUser(context.user!.userId, args.ids);
	},
	cancelJob: async (_parent, args, context) => {
		const workspaceId = await getAccessibleWorkspaceId(
			context.db,
			context.user!.userId,
			context.headers?.get("x-workspace-id") ?? undefined,
		);
		const activityService = context.container.resolve<ActivityService>(
			Tokens.ActivityService,
		);

		const [job] = await context.db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, args.jobId), eq(jobs.workspaceId, workspaceId)))
			.limit(1);

		if (!job) {
			throw new ValidationError("Job not found");
		}

		if (!CANCELLABLE_JOB_TYPES.has(job.type)) {
			throw new ValidationError(
				`Jobs of type "${job.type}" cannot be cancelled`,
			);
		}

		if (job.status === "completed") {
			throw new ValidationError("Job is already completed");
		}

		// Set generic Redis cancel flag
		await requestJobCancellation(job.id);

		// Try to remove pending BullMQ jobs from the appropriate queue
		await removePendingQueueJobs(job);

		// Mark job as cancelled
		await activityService.update(job.id, {
			status: "error",
			message: "Cancelled",
			metadata: {
				...(job.metadata ?? {}),
				phase: "cancelled",
				cancelled: true,
			},
		});

		return true;
	},
	resolveJobPause: async (_parent, args, context) => {
		const workspaceId = await getAccessibleWorkspaceId(
			context.db,
			context.user!.userId,
			context.headers?.get("x-workspace-id") ?? undefined,
		);

		const [job] = await context.db
			.select()
			.from(jobs)
			.where(and(eq(jobs.id, args.jobId), eq(jobs.workspaceId, workspaceId)))
			.limit(1);

		if (!job) {
			throw new ValidationError("Job not found");
		}

		if (job.status !== "paused") {
			throw new ValidationError("Job is not paused");
		}

		const { publishJobResolution } = await import("../../utils/jobs/job-pause");
		await publishJobResolution(job.id, args.resolution);

		const activityService = context.container.resolve<ActivityService>(
			Tokens.ActivityService,
		);
		const updatedJob = await activityService.update(job.id, {
			status: "running",
			message: "Resuming...",
		});

		return toGraphqlJob(updatedJob);
	},
};

/** Remove pending BullMQ jobs for a given tracking job, based on job type. */
async function removePendingQueueJobs(job: DbJob): Promise<void> {
	if (job.type === "provider_transfer") {
		const childJobIds = Array.isArray(job.metadata?.childJobIds)
			? job.metadata.childJobIds.filter(
					(value): value is string => typeof value === "string",
				)
			: [];
		if (childJobIds.length > 0) {
			const childJobs = await getDb()
				.select()
				.from(jobs)
				.where(inArray(jobs.id, childJobIds));
			const queue = getTransferQueue();
			for (const childJob of childJobs) {
				const childQueueJobId =
					typeof childJob.metadata?.queueJobId === "string"
						? childJob.metadata.queueJobId
						: null;
				if (!childQueueJobId) continue;
				const queueJob = await queue.getJob(childQueueJobId);
				const state = queueJob ? await queueJob.getState() : null;
				if (
					queueJob &&
					(state === "waiting" ||
						state === "delayed" ||
						state === "prioritized")
				) {
					await queueJob.remove().catch(() => {});
				}
			}
		}

		const queueJobId =
			typeof job.metadata?.queueJobId === "string"
				? job.metadata.queueJobId
				: null;
		if (queueJobId) {
			const queue = getTransferQueue();
			const queueJob = await queue.getJob(queueJobId);
			const state = queueJob ? await queueJob.getState() : null;
			if (
				queueJob &&
				(state === "waiting" || state === "delayed" || state === "prioritized")
			) {
				await queueJob.remove().catch(() => {});
			}
			return;
		}

		const fileId =
			typeof job.metadata?.fileId === "string" ? job.metadata.fileId : null;
		const targetProviderId =
			typeof job.metadata?.targetProviderId === "string"
				? job.metadata.targetProviderId
				: null;

		if (fileId && targetProviderId) {
			const queue = getTransferQueue();
			const queueJobId = buildTransferQueueJobId(fileId, targetProviderId);
			const queueJob = await queue.getJob(queueJobId);
			const state = queueJob ? await queueJob.getState() : null;
			if (
				queueJob &&
				(state === "waiting" || state === "delayed" || state === "prioritized")
			) {
				await queueJob.remove().catch(() => {});
			}
		}
	} else if (job.type === "smart-search-indexing") {
		// Drain waiting extraction jobs that belong to this tracking job
		const queue = getExtractionQueue();
		const waiting = await queue.getJobs(["waiting", "delayed"]);
		for (const queueJob of waiting) {
			if (queueJob.data?.trackingJobId === job.id) {
				await queueJob.remove().catch(() => {});
			}
		}
	}
}

export const activitySubscriptions: SubscriptionResolvers = {
	jobUpdated: {
		subscribe: async (_parent, _args, context) => {
			const workspaceId = await getAccessibleWorkspaceId(
				context.db,
				context.user!.userId,
				context.headers?.get("x-workspace-id") ?? undefined,
			);
			return pubSub.subscribe("activityUpdated", workspaceId);
		},
		resolve: (payload: PubSubChannels["activityUpdated"][1]) =>
			toGraphqlJob(payload),
	},
	activityCreated: {
		subscribe: async (_parent, _args, context) => {
			return pubSub.subscribe("activityCreated", context.user!.userId);
		},
		resolve: (payload: PubSubChannels["activityCreated"][1]) => payload,
	},
};
