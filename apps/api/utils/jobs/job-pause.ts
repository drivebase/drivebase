import { getRedis } from "@/redis/client";
import { logger } from "@/utils/runtime/logger";

export async function waitForJobResolution<T = any>(
	jobId: string,
	timeoutMs = 10 * 60 * 1000,
): Promise<T> {
	const redis = getRedis().duplicate();
	const channel = `job:resolution:${jobId}`;

	logger.debug({ msg: "Waiting for job resolution", jobId, channel });

	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			redis.quit().catch(() => {});
			reject(new Error("Timeout waiting for user resolution"));
		}, timeoutMs);

		redis.subscribe(channel, (err) => {
			if (err) {
				clearTimeout(timeout);
				redis.quit().catch(() => {});
				reject(err);
			}
		});

		redis.on("message", (ch, message) => {
			if (ch === channel) {
				clearTimeout(timeout);
				redis.quit().catch(() => {});
				try {
					resolve(JSON.parse(message));
				} catch {
					resolve(message as any);
				}
			}
		});
	});
}

export async function publishJobResolution(jobId: string, resolution: any) {
	const redis = getRedis();
	await redis.publish(`job:resolution:${jobId}`, JSON.stringify(resolution));
	logger.debug({ msg: "Published job resolution", jobId, resolution });
}
