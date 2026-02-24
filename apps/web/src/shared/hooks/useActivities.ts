import { useEffect, useMemo, useRef } from "react";
import { useQuery, useSubscription } from "urql";
import { JobStatus } from "@/gql/graphql";
import {
	ACTIVE_JOBS_QUERY,
	JOB_UPDATED_SUBSCRIPTION,
} from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";

export function useActivities() {
	const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);
	const jobs = useActivityStore((state) => state.jobs);
	const setJob = useActivityStore((state) => state.setJob);
	const removeJob = useActivityStore((state) => state.removeJob);

	const [{ data: activeJobsData }] = useQuery({
		query: ACTIVE_JOBS_QUERY,
	});

	const [{ data: jobUpdatedData }] = useSubscription({
		query: JOB_UPDATED_SUBSCRIPTION,
	});

	useEffect(() => {
		for (const job of activeJobsData?.activeJobs ?? []) {
			setJob(job);
		}
	}, [activeJobsData, setJob]);

	useEffect(() => {
		const job = jobUpdatedData?.jobUpdated;
		if (!job) return;

		setJob(job);

		if (job.status === JobStatus.Completed || job.status === JobStatus.Error) {
			const existingTimer = timersRef.current.get(job.id);
			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			const timer = setTimeout(() => {
				removeJob(job.id);
				timersRef.current.delete(job.id);
			}, 5000);

			timersRef.current.set(job.id, timer);
		} else {
			const existingTimer = timersRef.current.get(job.id);
			if (existingTimer) {
				clearTimeout(existingTimer);
				timersRef.current.delete(job.id);
			}
		}
	}, [jobUpdatedData, removeJob, setJob]);

	useEffect(() => {
		return () => {
			for (const timer of timersRef.current.values()) {
				clearTimeout(timer);
			}
			timersRef.current.clear();
		};
	}, []);

	return useMemo(() => ({ jobs }), [jobs]);
}
