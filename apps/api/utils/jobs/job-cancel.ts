import { getRedis } from "../../redis/client";

const CANCEL_TTL_SECONDS = 24 * 60 * 60;

export function getJobCancelKey(jobId: string): string {
	return `job:cancel:${jobId}`;
}

export class JobCancelledError extends Error {
	constructor(jobType?: string) {
		super(jobType ? `${jobType} cancelled` : "Job cancelled");
		this.name = "JobCancelledError";
	}
}

export async function requestJobCancellation(jobId: string): Promise<void> {
	const redis = getRedis();
	await redis.set(getJobCancelKey(jobId), "1", "EX", CANCEL_TTL_SECONDS);
}

export async function clearJobCancellation(jobId: string): Promise<void> {
	const redis = getRedis();
	await redis.del(getJobCancelKey(jobId)).catch(() => {});
}

export async function assertNotCancelled(jobId: string): Promise<void> {
	const redis = getRedis();
	const cancelled = await redis.get(getJobCancelKey(jobId));
	if (cancelled) {
		throw new JobCancelledError();
	}
}
