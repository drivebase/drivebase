import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Job, JobStatus } from "@/gql/graphql";
import {
	JOB_UPDATED_SUBSCRIPTION,
	RECENT_JOBS_QUERY,
} from "@/shared/api/activity";
import { useJobsFeed } from "./useJobsFeed";

const useQueryMock = vi.fn();
const useSubscriptionMock = vi.fn();
const useActivityStoreMock = vi.fn();
const setJobMock = vi.fn();
const reexecuteRecentJobsMock = vi.fn();

vi.mock("urql", () => ({
	useQuery: (args: unknown) => useQueryMock(args),
	useSubscription: (args: unknown) => useSubscriptionMock(args),
}));

vi.mock("@/shared/store/activityStore", () => ({
	useActivityStore: (
		selector: (state: {
			jobs: Map<string, Job>;
			setJob: (job: Job) => void;
		}) => unknown,
	) => useActivityStoreMock(selector),
}));

function createJob(overrides: Partial<Job> = {}): Job {
	return {
		__typename: "Job",
		id: "job-1",
		type: "provider_transfer",
		title: "Copy file",
		message: "Completed",
		progress: 1,
		status: JobStatus.Completed,
		metadata: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

describe("useJobsFeed", () => {
	afterEach(() => {
		cleanup();
	});

	beforeEach(() => {
		useQueryMock.mockReset();
		useSubscriptionMock.mockReset();
		useActivityStoreMock.mockReset();
		setJobMock.mockReset();
		reexecuteRecentJobsMock.mockReset();

		useActivityStoreMock.mockImplementation(
			(
				selector: (state: {
					jobs: Map<string, Job>;
					setJob: (job: Job) => void;
				}) => unknown,
			) =>
				selector({
					jobs: new Map(),
					setJob: setJobMock,
				}),
		);
		useQueryMock.mockReturnValue([
			{
				data: {
					recentJobs: [createJob()],
				},
			},
			reexecuteRecentJobsMock,
		]);
		useSubscriptionMock.mockReturnValue([{ data: null }]);
	});

	it("hydrates the store from recent jobs instead of only active jobs", () => {
		renderHook(() => useJobsFeed());

		expect(useQueryMock).toHaveBeenCalledWith({
			query: RECENT_JOBS_QUERY,
			variables: { limit: 50, offset: 0 },
			requestPolicy: "cache-and-network",
		});
		expect(setJobMock).toHaveBeenCalledWith(
			expect.objectContaining({ id: "job-1" }),
		);
	});

	it("still applies subscription updates for incremental job changes", () => {
		useSubscriptionMock.mockReturnValue([
			{
				data: {
					jobUpdated: createJob({
						id: "job-2",
						status: JobStatus.Running,
						progress: 0.4,
						message: "Transferring",
					}),
				},
			},
		]);

		renderHook(() => useJobsFeed());

		expect(useSubscriptionMock).toHaveBeenCalledWith({
			query: JOB_UPDATED_SUBSCRIPTION,
		});
		expect(setJobMock).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "job-2",
				status: JobStatus.Running,
			}),
		);
	});

	it("polls recent jobs while active work is present", () => {
		vi.useFakeTimers();
		useActivityStoreMock.mockImplementation(
			(
				selector: (state: {
					jobs: Map<string, Job>;
					setJob: (job: Job) => void;
				}) => unknown,
			) =>
				selector({
					jobs: new Map([
						[
							"job-1",
							createJob({
								status: JobStatus.Pending,
								progress: 0,
								message: "Queued for transfer",
							}),
						],
					]),
					setJob: setJobMock,
				}),
		);

		renderHook(() => useJobsFeed());

		vi.advanceTimersByTime(3000);

		expect(reexecuteRecentJobsMock).toHaveBeenCalledWith({
			requestPolicy: "network-only",
		});
		vi.useRealTimers();
	});
});
