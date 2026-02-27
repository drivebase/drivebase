import { useEffect, useMemo } from "react";
import { useQuery, useSubscription } from "urql";
import {
	ACTIVE_JOBS_QUERY,
	JOB_UPDATED_SUBSCRIPTION,
} from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";

export function useJobsFeed() {
	const jobs = useActivityStore((state) => state.jobs);
	const setJobs = useActivityStore((state) => state.setJobs);
	const setJob = useActivityStore((state) => state.setJob);

	const [{ data: activeJobsData }] = useQuery({
		query: ACTIVE_JOBS_QUERY,
		requestPolicy: "cache-and-network",
	});
	const [{ data: jobUpdatedData }] = useSubscription({
		query: JOB_UPDATED_SUBSCRIPTION,
	});

	useEffect(() => {
		if (activeJobsData?.activeJobs) {
			setJobs(activeJobsData.activeJobs);
		}
	}, [activeJobsData, setJobs]);

	useEffect(() => {
		const job = jobUpdatedData?.jobUpdated;
		if (!job) return;
		setJob(job);
	}, [jobUpdatedData, setJob]);

	return useMemo(() => ({ jobs }), [jobs]);
}
