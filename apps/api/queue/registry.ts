import { Queue, type Worker } from "bullmq";
import { createBullMQConnection } from "../redis/client";
import { logger } from "../utils/runtime/logger";

interface QueueRegistration<TData = unknown> {
	name: string;
	defaultJobOptions?: Record<string, unknown>;
	factory: () => Worker<TData>;
}

class QueueRegistry {
	private registrations: QueueRegistration<unknown>[] = [];
	private queues = new Map<string, Queue<unknown>>();
	private workers: Worker<unknown>[] = [];

	register<TData>(reg: QueueRegistration<TData>): void {
		this.registrations.push(reg as QueueRegistration<unknown>);
		const queue = new Queue<TData>(reg.name, {
			connection: createBullMQConnection(),
			defaultJobOptions: reg.defaultJobOptions,
		});
		this.queues.set(reg.name, queue as Queue<unknown>);
	}

	getQueue<TData>(name: string): Queue<TData> {
		const queue = this.queues.get(name);
		if (!queue) throw new Error(`Queue "${name}" not registered`);
		return queue as Queue<TData>;
	}

	startAll(): void {
		for (const reg of this.registrations) {
			const worker = (reg as QueueRegistration<unknown>).factory();
			this.workers.push(worker);
			logger.info(`${reg.name} worker started`);
		}
	}

	async stopAll(): Promise<void> {
		await Promise.all(this.workers.map((w) => w.close()));
		await Promise.all([...this.queues.values()].map((q) => q.close()));
		this.workers = [];
	}
}

export const registry = new QueueRegistry();
