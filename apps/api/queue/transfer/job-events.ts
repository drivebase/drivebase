import Redis from "ioredis";
import { env } from "@/config/env";

function channelKey(parentJobId: string): string {
	return `transfer:child-done:${parentJobId}`;
}

export interface ChildCompletionMessage {
	childJobId: string;
	status: "completed" | "error";
}

/** Publish that a child job finished (fire-and-forget on the shared connection). */
export async function publishChildCompletion(
	redis: Redis,
	parentJobId: string,
	childJobId: string,
	status: "completed" | "error",
): Promise<void> {
	const payload: ChildCompletionMessage = { childJobId, status };
	await redis.publish(channelKey(parentJobId), JSON.stringify(payload));
}

/** Subscribe to child-done events for a parent job. Returns an unsubscribe fn. */
export async function subscribeChildCompletion(
	parentJobId: string,
	callback: (msg: ChildCompletionMessage) => void,
): Promise<{ unsubscribe: () => Promise<void> }> {
	const sub = new Redis(env.REDIS_URL, {
		maxRetriesPerRequest: null,
		enableReadyCheck: true,
		lazyConnect: false,
	});
	const channel = channelKey(parentJobId);

	sub.on("message", (_ch: string, raw: string) => {
		try {
			callback(JSON.parse(raw) as ChildCompletionMessage);
		} catch {
			// Malformed message — ignore
		}
	});

	await sub.subscribe(channel);

	return {
		async unsubscribe() {
			await sub.unsubscribe(channel).catch(() => {});
			await sub.quit().catch(() => {});
		},
	};
}
