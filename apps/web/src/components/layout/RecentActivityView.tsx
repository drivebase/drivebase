import { Trans } from "@lingui/react/macro";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useQuery, useSubscription } from "urql";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecentActivitiesQuery } from "@/gql/graphql";
import {
	ACTIVITY_CREATED_SUBSCRIPTION,
	RECENT_ACTIVITIES_QUERY,
} from "@/shared/api/activity";

function hasDetailsValue(details: unknown): boolean {
	if (details == null) return false;
	if (Array.isArray(details)) return details.length > 0;
	if (typeof details === "object") return Object.keys(details).length > 0;
	if (typeof details === "string") return details.trim().length > 0;
	return true;
}

export function RecentActivityView() {
	const RECENT_ACTIVITY_LIMIT = 10;
	const [localActivities, setLocalActivities] = useState<
		NonNullable<RecentActivitiesQuery["activities"]>
	>([]);
	const [selectedActivity, setSelectedActivity] = useState<
		NonNullable<RecentActivitiesQuery["activities"]>[number] | null
	>(null);
	const [showJsonDetails, setShowJsonDetails] = useState(false);
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

	const handleOpenActivity = (
		activity: NonNullable<RecentActivitiesQuery["activities"]>[number],
	) => {
		setSelectedActivity(activity);
		setShowJsonDetails(false);
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
						<Trans>Clear</Trans>
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
						<button
							key={activity.id}
							type="button"
							onClick={() => handleOpenActivity(activity)}
							className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors"
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
						</button>
					);
				})}
			</div>
			<Dialog
				open={selectedActivity !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedActivity(null);
						setShowJsonDetails(false);
					}
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>
							{selectedActivity?.title ?? <Trans>Activity</Trans>}
						</DialogTitle>
					</DialogHeader>
					{selectedActivity ? (
						<div className="space-y-3 text-sm">
							{(() => {
								const details =
									selectedActivity.details &&
									typeof selectedActivity.details === "object" &&
									!Array.isArray(selectedActivity.details)
										? (selectedActivity.details as Record<string, unknown>)
										: null;
								const jobId =
									details && typeof details.jobId === "string"
										? details.jobId
										: null;
								if (!jobId) return null;
								return (
									<p className="text-xs text-muted-foreground">
										<Trans>Job ID</Trans>:{" "}
										<span className="font-mono">{jobId}</span>
									</p>
								);
							})()}
							{selectedActivity.summary ? (
								<p className="text-muted-foreground whitespace-pre-wrap break-words">
									{selectedActivity.summary}
								</p>
							) : null}
							<div className="text-xs text-muted-foreground">
								{new Date(
									selectedActivity.occurredAt ?? selectedActivity.createdAt,
								).toLocaleString()}
							</div>
							{hasDetailsValue(selectedActivity.details) ? (
								<>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setShowJsonDetails((prev) => !prev)}
									>
										{showJsonDetails ? (
											<Trans>Hide JSON</Trans>
										) : (
											<Trans>Show JSON</Trans>
										)}
									</Button>
									{showJsonDetails ? (
										<pre className="max-h-64 w-full max-w-full overflow-auto whitespace-pre-wrap break-all rounded border bg-muted/30 p-3 text-xs">
											{JSON.stringify(selectedActivity.details, null, 2)}
										</pre>
									) : null}
								</>
							) : null}
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</div>
	);
}
