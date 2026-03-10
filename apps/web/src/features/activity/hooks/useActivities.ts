import { useState } from "react";
import { useMutation, useQuery, useSubscription } from "urql";
import type { ActivitiesPageQuery } from "@/gql/graphql";
import {
	ACTIVITIES_PAGE_QUERY,
	ACTIVITY_CREATED_SUBSCRIPTION,
	CLEAR_ACTIVITIES_MUTATION,
} from "../api/activity";

export const PAGE_SIZE = 10;

export type ActivityItem = ActivitiesPageQuery["activities"]["nodes"][number];

export function useActivities() {
	const [page, setPage] = useState(0);
	// Real-time activities prepended on page 0 only
	const [liveItems, setLiveItems] = useState<ActivityItem[]>([]);

	const [{ data, fetching }] = useQuery({
		query: ACTIVITIES_PAGE_QUERY,
		variables: { page: page + 1, limit: PAGE_SIZE },
		requestPolicy: "cache-and-network",
	});

	useSubscription(
		{ query: ACTIVITY_CREATED_SUBSCRIPTION },
		(_prev, payload) => {
			if (!payload?.activityCreated) return payload;
			const incoming = payload.activityCreated;
			setLiveItems((prev) => {
				if (prev.some((a) => a.id === incoming.id)) return prev;
				return [incoming, ...prev];
			});
			return payload;
		},
	);

	const serverActivities = data?.activities?.nodes ?? [];

	// On page 0 prepend live items, deduplicating against server data
	const activities: ActivityItem[] =
		page === 0
			? [
					...liveItems.filter(
						(l) => !serverActivities.some((s) => s.id === l.id),
					),
					...serverActivities,
				]
			: serverActivities;

	// Use server-provided pagination meta
	const meta = data?.activities?.meta;
	const hasNextPage = meta?.hasNextPage ?? false;

	const [, clearMutation] = useMutation(CLEAR_ACTIVITIES_MUTATION);

	async function clearActivities(ids: string[]) {
		if (ids.length === 0) return;
		setLiveItems((prev) => prev.filter((a) => !ids.includes(a.id)));
		await clearMutation({ ids });
	}

	return {
		activities,
		fetching,
		page,
		setPage,
		hasNextPage,
		totalPages: meta?.totalPages ?? 1,
		total: meta?.total ?? 0,
		clearActivities,
	};
}
