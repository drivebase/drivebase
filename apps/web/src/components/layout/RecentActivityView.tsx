import { Trans } from "@lingui/react/macro";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useQuery, useSubscription } from "urql";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type RecentActivitiesQuery } from "@/gql/graphql";
import {
	ACTIVITY_CREATED_SUBSCRIPTION,
	RECENT_ACTIVITIES_QUERY,
} from "@/shared/api/activity";

export function RecentActivityView() {
	const RECENT_ACTIVITY_LIMIT = 10;
	const [localActivities, setLocalActivities] = useState<
		NonNullable<RecentActivitiesQuery["activities"]>
	>([]);
	const [offset, setOffset] = useState(0);
	const [{ data, fetching }] = useQuery({
		query: RECENT_ACTIVITIES_QUERY,
		variables: { limit: RECENT_ACTIVITY_LIMIT, offset },
		requestPolicy: "cache-and-network",
	});

	useSubscription(
		{ query: ACTIVITY_CREATED_SUBSCRIPTION },
		(_prev, payload) => {
			if (!payload?.activityCreated) {
				return payload;
			}
			const newActivity = payload.activityCreated;
			setLocalActivities((prev) => {
				if (prev.some((activity) => activity.id === newActivity.id)) {
					return prev;
				}
				return [newActivity, ...prev].slice(0, RECENT_ACTIVITY_LIMIT);
			});
			return payload;
		},
	);

	const serverActivities = data?.activities ?? [];
	const seenIds = new Set(localActivities.map((activity) => activity.id));
	const recentActivities = [
		...localActivities,
		...serverActivities.filter((activity) => !seenIds.has(activity.id)),
	].slice(0, RECENT_ACTIVITY_LIMIT);

	const handleClearActivities = () => {
		if (recentActivities.length === 0) return;
		setLocalActivities([]);
		setOffset((prev) => prev + recentActivities.length);
	};

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="flex items-center justify-between mb-4 px-4">
				<h3 className="font-semibold">
					<Trans>Recent Activity</Trans>
				</h3>
				{recentActivities.length > 0 && (
					<Button
						size="sm"
						variant="link"
						className="h-7 text-xs text-muted-foreground px-0"
						onClick={handleClearActivities}
						disabled={fetching}
					>
						Clear
					</Button>
				)}
			</div>
			<div>
				{fetching &&
					Array.from({ length: 3 }).map((_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton items have no stable id
						<div key={index} className="space-y-2 py-2 px-3">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-3 w-4/5" />
							<Skeleton className="h-3 w-1/3" />
						</div>
					))}
				{!fetching && recentActivities.length === 0 && (
					<div className="text-sm text-muted-foreground text-center py-8">
						<Trans>No recent activity</Trans>
					</div>
				)}
				{recentActivities.map((activity) => {
					const occurredAt = new Date(
						activity.occurredAt ?? activity.createdAt,
					);
					return (
						<div
							key={activity.id}
							className="px-4 py-2.5 hover:bg-muted transition-colors"
						>
							<p className="text-sm font-medium leading-snug truncate">
								{activity.title}
							</p>
							<p className="text-xs text-muted-foreground truncate mt-0.5 min-h-4">
								{activity.summary ?? "\u00a0"}
							</p>
							<time
								dateTime={occurredAt.toISOString()}
								title={occurredAt.toLocaleString()}
								className="text-xs text-muted-foreground mt-1 block"
							>
								{formatDistanceToNow(occurredAt, { addSuffix: true })}
							</time>
						</div>
					);
				})}
			</div>
		</div>
	);
}
