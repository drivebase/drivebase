import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
	publishJobResolution,
	waitForJobResolution,
} from "../../utils/jobs/job-pause";

const mockRedisClient = {
	duplicate: mock(),
	subscribe: mock(),
	on: mock(),
	quit: mock(),
	publish: mock(),
};

mock.module("../../redis/client", () => ({
	getRedis: () => mockRedisClient,
}));

describe("Job Pause Resolution", () => {
	beforeEach(() => {
		mockRedisClient.duplicate.mockReturnValue(mockRedisClient);
		mockRedisClient.subscribe.mockImplementation((channel, cb) => {
			if (cb) cb(null);
		});
		mockRedisClient.on.mockImplementation((event, cb) => {
			// We will trigger this manually in tests
		});
		mockRedisClient.quit.mockResolvedValue(undefined);
		mockRedisClient.publish.mockResolvedValue(1);
	});

	afterEach(() => {
		mock.restore();
	});

	it("should wait for and parse job resolution", async () => {
		const jobId = "test-job-123";
		const resolution = { action: "overwrite", applyToAll: true };
		const channel = `job:resolution:${jobId}`;

		// Set up a mock to simulate receiving a message after a short delay
		mockRedisClient.on.mockImplementation((event, cb) => {
			if (event === "message") {
				setTimeout(() => {
					cb(channel, JSON.stringify(resolution));
				}, 10);
			}
		});

		const result = await waitForJobResolution(jobId, 1000);
		expect(result).toEqual(resolution);
		expect(mockRedisClient.subscribe).toHaveBeenCalled();
		expect(mockRedisClient.quit).toHaveBeenCalled();
	});

	it("should timeout if no resolution is received", async () => {
		const jobId = "test-job-456";

		// Don't trigger any messages
		mockRedisClient.on.mockImplementation(() => {});

		// Use a very short timeout
		const promise = waitForJobResolution(jobId, 10);

		expect(promise).rejects.toThrow("Timeout waiting for user resolution");
	});

	it("should publish job resolution to correct channel", async () => {
		const jobId = "test-job-789";
		const resolution = { action: "skip" };

		await publishJobResolution(jobId, resolution);

		expect(mockRedisClient.publish).toHaveBeenCalledWith(
			`job:resolution:${jobId}`,
			JSON.stringify(resolution),
		);
	});
});
