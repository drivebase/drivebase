import { create } from "zustand";
import { type Job, JobStatus } from "@/gql/graphql";

export interface ActivityListItem {
	id: string;
	kind: string;
	title: string;
	summary?: string | null;
	status?: string | null;
	progress?: number | null;
	details?: unknown;
	workspaceId?: string | null;
	occurredAt: string;
	createdAt: string;
}

interface ActivityStore {
	jobs: Map<string, Job>;
	activities: Map<string, ActivityListItem>;
	setJobs: (jobs: Job[]) => void;
	setJob: (job: Job) => void;
	removeJob: (id: string) => void;
	setActivity: (activity: ActivityListItem) => void;
	removeActivity: (id: string) => void;
	clearCompleted: () => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
	jobs: new Map<string, Job>(),
	activities: new Map<string, ActivityListItem>(),
	setJobs: (jobs) =>
		set(() => ({
			jobs: new Map(jobs.map((job) => [job.id, job])),
		})),
	setJob: (job) =>
		set((state) => {
			const jobs = new Map(state.jobs);
			jobs.set(job.id, job);
			return { jobs };
		}),
	removeJob: (id) =>
		set((state) => {
			if (!state.jobs.has(id)) {
				return state;
			}
			const jobs = new Map(state.jobs);
			jobs.delete(id);
			return { jobs };
		}),
	setActivity: (activity) =>
		set((state) => {
			const activities = new Map(state.activities);
			activities.set(activity.id, activity);
			return { activities };
		}),
	removeActivity: (id) =>
		set((state) => {
			if (!state.activities.has(id)) {
				return state;
			}
			const activities = new Map(state.activities);
			activities.delete(id);
			return { activities };
		}),
	clearCompleted: () =>
		set((state) => {
			const jobs = new Map<string, Job>();
			for (const [id, job] of state.jobs.entries()) {
				if (
					job.status === JobStatus.Pending ||
					job.status === JobStatus.Running
				) {
					jobs.set(id, job);
				}
			}
			return { jobs, activities: state.activities };
		}),
}));
