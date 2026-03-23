import { useEffect, useMemo } from "react";
import { useQuery, useSubscription } from "urql";
import { JobStatus } from "@/gql/graphql";
import {
	JOB_UPDATED_SUBSCRIPTION,
	RECENT_JOBS_QUERY,
} from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";

export function useJobsFeed() {
	const jobs = useActivityStore((state) => state.jobs);
	const setJob = useActivityStore((state) => state.setJob);

	const [{ data: recentJobsData }, reexecuteRecentJobs] = useQuery({
		query: RECENT_JOBS_QUERY,
		variables: { limit: 50, offset: 0 },
		requestPolicy: "cache-and-network",
	});
	const [{ data: jobUpdatedData }] = useSubscription({
		query: JOB_UPDATED_SUBSCRIPTION,
	});

	useEffect(() => {
		if (recentJobsData?.recentJobs) {
			for (const job of recentJobsData.recentJobs) {
				setJob(job);
			}
		}
	}, [recentJobsData, setJob]);

	useEffect(() => {
		const job = jobUpdatedData?.jobUpdated;
		if (!job) return;
		setJob(job);
	}, [jobUpdatedData, setJob]);

	const hasActiveJobs = useMemo(
		() =>
			Array.from(jobs.values()).some(
				(job) =>
					job.status === JobStatus.Pending ||
					job.status === JobStatus.Running ||
					job.status === JobStatus.Paused,
			),
		[jobs],
	);

	useEffect(() => {
		if (!hasActiveJobs) {
			return;
		}

		const interval = window.setInterval(() => {
			reexecuteRecentJobs({ requestPolicy: "network-only" });
		}, 3000);

		return () => window.clearInterval(interval);
	}, [hasActiveJobs, reexecuteRecentJobs]);

	return useMemo(() => ({ jobs }), [jobs]);
}
