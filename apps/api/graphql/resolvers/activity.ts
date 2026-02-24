import { ActivityService } from "../../services/activity";
import type { Job as DbJob } from "@drivebase/db";
import { getAccessibleWorkspaceId } from "../../services/workspace/workspace";
import {
	JobStatus,
	type Job,
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

export const activityQueries: QueryResolvers = {
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
