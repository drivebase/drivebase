import { Trans } from "@lingui/react/macro";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { useQuery, useSubscription } from "urql";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JobStatus, type RecentActivitiesQuery } from "@/gql/graphql";
import {
	ACTIVITY_CREATED_SUBSCRIPTION,
	RECENT_ACTIVITIES_QUERY,
} from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";

export function RecentActivityView() {
	const jobsMap = useActivityStore((state) => state.jobs);
	const [localActivities, setLocalActivities] = useState<
		NonNullable<RecentActivitiesQuery["activities"]>
	>([]);
	const [offset, setOffset] = useState(0);
	const [{ data, fetching }] = useQuery({
		query: RECENT_ACTIVITIES_QUERY,
		variables: { limit: 5, offset },
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
				return [newActivity, ...prev].slice(0, 5);
			});
			return payload;
		},
	);

	const recentJobs = useMemo(
		() =>
			Array.from(jobsMap.values())
				.sort(
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				)
				.slice(0, 3),
		[jobsMap],
	);
	const hasProcessingJobs = recentJobs.some(
		(job) =>
			job.status === JobStatus.Pending || job.status === JobStatus.Running,
	);
	const serverActivities = data?.activities ?? [];
	const seenIds = new Set(localActivities.map((activity) => activity.id));
	const recentActivities = [
		...localActivities,
		...serverActivities.filter((activity) => !seenIds.has(activity.id)),
	].slice(0, 5);

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
				{recentActivities.length > 0 && !hasProcessingJobs && (
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
				{!fetching &&
					recentJobs.length === 0 &&
					recentActivities.length === 0 && (
						<div className="text-sm text-muted-foreground text-center py-8">
							<Trans>No recent activity</Trans>
						</div>
					)}
				{recentJobs.map((job) => (
					<div key={job.id} className="p-3 hover:bg-muted transition-colors">
						<p className="text-sm font-medium leading-snug line-clamp-1">
							{job.title}
						</p>
						<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
							{job.message ??
								(job.status === JobStatus.Running
									? "Running"
									: job.status === JobStatus.Pending
										? "Pending"
										: job.status === JobStatus.Completed
											? "Completed"
											: "Failed")}
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							{new Date(job.updatedAt).toLocaleString()}
						</p>
					</div>
				))}
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
							{activity.summary ? (
								<p className="text-xs text-muted-foreground truncate mt-0.5">
									{activity.summary}
								</p>
							) : null}
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
