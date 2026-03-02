import { getRedis } from "../redis/client";

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

/** Set the cancellation flag in Redis for a given job. */
export async function requestJobCancellation(jobId: string): Promise<void> {
	const redis = getRedis();
	await redis.set(getJobCancelKey(jobId), "1", "EX", CANCEL_TTL_SECONDS);
}

/** Clear the cancellation flag (call in finally blocks). */
export async function clearJobCancellation(jobId: string): Promise<void> {
	const redis = getRedis();
	await redis.del(getJobCancelKey(jobId)).catch(() => {});
}

/** Check if the job has been cancelled; throws JobCancelledError if so. */
export async function assertNotCancelled(jobId: string): Promise<void> {
	const redis = getRedis();
	const cancelled = await redis.get(getJobCancelKey(jobId));
	if (cancelled) {
		throw new JobCancelledError();
	}
}
