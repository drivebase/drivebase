import { useEffect } from "react";
import { useQuery, useSubscription } from "urql";
import {
	ACTIVITY_CREATED_SUBSCRIPTION,
	RECENT_ACTIVITIES_QUERY,
} from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";

export function useActivityFeed() {
	const setActivity = useActivityStore((state) => state.setActivity);

	const [{ data: recentActivitiesData }] = useQuery({
		query: RECENT_ACTIVITIES_QUERY,
		variables: { limit: 20, offset: 0 },
		requestPolicy: "cache-and-network",
	});
	const [{ data: activityCreatedData }] = useSubscription({
		query: ACTIVITY_CREATED_SUBSCRIPTION,
	});

	useEffect(() => {
		for (const activity of recentActivitiesData?.activities ?? []) {
			setActivity(activity);
		}
	}, [recentActivitiesData, setActivity]);

	useEffect(() => {
		const activity = activityCreatedData?.activityCreated;
		if (!activity) return;
		setActivity(activity);
	}, [activityCreatedData, setActivity]);
}
