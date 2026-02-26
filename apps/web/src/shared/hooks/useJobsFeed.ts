import { useEffect, useMemo } from "react";
import { useQuery, useSubscription } from "urql";
import {
	JOB_UPDATED_SUBSCRIPTION,
	RECENT_JOBS_QUERY,
} from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";

export function useJobsFeed() {
	const jobs = useActivityStore((state) => state.jobs);
	const setJobs = useActivityStore((state) => state.setJobs);
	const setJob = useActivityStore((state) => state.setJob);

	const [{ data: recentJobsData }] = useQuery({
		query: RECENT_JOBS_QUERY,
		variables: { limit: 50, offset: 0 },
		requestPolicy: "cache-and-network",
	});
	const [{ data: jobUpdatedData }] = useSubscription({
		query: JOB_UPDATED_SUBSCRIPTION,
	});

	useEffect(() => {
		if (recentJobsData?.recentJobs) {
			setJobs(recentJobsData.recentJobs);
		}
	}, [recentJobsData, setJobs]);

	useEffect(() => {
		const job = jobUpdatedData?.jobUpdated;
		if (!job) return;
		setJob(job);
	}, [jobUpdatedData, setJob]);

	return useMemo(() => ({ jobs }), [jobs]);
}
