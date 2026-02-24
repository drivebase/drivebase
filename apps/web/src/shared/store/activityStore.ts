import { create } from "zustand";
import { JobStatus, type Job } from "@/gql/graphql";

interface ActivityStore {
	jobs: Map<string, Job>;
	setJob: (job: Job) => void;
	removeJob: (id: string) => void;
	clearCompleted: () => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
	jobs: new Map<string, Job>(),
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
			return { jobs };
		}),
}));
