import { beforeEach, describe, expect, it } from "vitest";
import { type Job, JobStatus } from "@/gql/graphql";
import { useActivityStore } from "./activityStore";

function createJob(overrides: Partial<Job> = {}): Job {
	return {
		__typename: "Job",
		id: "job-1",
		type: "provider_transfer",
		title: "Copy file",
		message: "Queued for transfer",
		progress: 0,
		status: JobStatus.Pending,
		metadata: null,
		createdAt: "2026-03-19T00:00:00.000Z",
		updatedAt: "2026-03-19T00:00:00.000Z",
		...overrides,
	};
}

describe("activityStore", () => {
	beforeEach(() => {
		useActivityStore.setState({
			jobs: new Map(),
			activities: new Map(),
		});
	});

	it("ignores stale job snapshots", () => {
		const newerJob = createJob({
			status: JobStatus.Running,
			progress: 0.5,
			message: "Downloading 1 of 3 files",
			updatedAt: "2026-03-19T00:00:05.000Z",
		});
		const staleJob = createJob({
			status: JobStatus.Pending,
			progress: 0,
			message: "Queued for transfer",
			updatedAt: "2026-03-19T00:00:01.000Z",
		});

		useActivityStore.getState().setJob(newerJob);
		useActivityStore.getState().setJob(staleJob);

		expect(useActivityStore.getState().jobs.get("job-1")).toMatchObject({
			status: JobStatus.Running,
			message: "Downloading 1 of 3 files",
			updatedAt: "2026-03-19T00:00:05.000Z",
		});
	});
});
