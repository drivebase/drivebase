import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ActivityService } from "@/service/activity";
import { jobs } from "@drivebase/db";
import { eq, sql } from "drizzle-orm";

mock.module("@drivebase/db", () => ({
	jobs: {
		id: "id",
		metadata: "metadata",
		updatedAt: "updated_at",
	},
	activities: { id: "id" },
}));

mock.module("../graphql/pubsub", () => ({
	pubSub: {
		publish: mock(),
	},
}));

describe("ActivityService", () => {
	let db: any;
	let service: ActivityService;

	beforeEach(() => {
		db = {
			update: mock().mockReturnThis(),
			set: mock().mockReturnThis(),
			where: mock().mockReturnThis(),
			returning: mock().mockResolvedValue([
				{ id: "job-1", workspaceId: "ws-1" },
			]),
			insert: mock().mockReturnThis(),
			values: mock().mockReturnThis(),
		};
		service = new ActivityService(db as any);
	});

	describe("update", () => {
		it("merges metadata by default using sql concatenation", async () => {
			await service.update("job-1", {
				metadata: { newKey: "newValue" },
			});

			expect(db.set).toHaveBeenCalled();
			const setArg = db.set.mock.calls[0][0];

			// Verify that the metadata update uses the sql operator for merging
			expect(setArg.metadata).toBeDefined();
			// Drizzle's sql objects are a bit hard to inspect, but we can check if it's not a plain object
			expect(typeof setArg.metadata).toBe("object");
			expect(setArg.metadata).not.toEqual({ newKey: "newValue" });
		});

		it("replaces metadata when replaceMetadata is true", async () => {
			await service.update("job-1", {
				metadata: { replaceKey: "replaceValue" },
				replaceMetadata: true,
			});

			expect(db.set).toHaveBeenCalled();
			const setArg = db.set.mock.calls[0][0];

			// Should be a plain object, not a sql template
			expect(setArg.metadata).toEqual({ replaceKey: "replaceValue" });
		});
	});
});
