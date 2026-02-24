import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Settings2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useSubscription } from "urql";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import {
	ActivityType,
	JobStatus,
	type RecentActivitiesQuery,
} from "@/gql/graphql";
import {
	ACTIVITY_CREATED_SUBSCRIPTION,
	DELETE_ACTIVITIES_MUTATION,
	RECENT_ACTIVITIES_QUERY,
} from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";
import { useRightPanelStore } from "@/shared/store/rightPanelStore";

function formatBytes(bytes: number) {
	if (!bytes) return null;
	const units = ["B", "KB", "MB", "GB"];
	const exp = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

function DefaultView() {
	const user = useAuthStore((state) => state.user);
	const navigate = useNavigate();
	const jobsMap = useActivityStore((state) => state.jobs);
	const [localActivities, setLocalActivities] = useState<
		NonNullable<RecentActivitiesQuery["activities"]>
	>([]);
	const [offset, setOffset] = useState(0);
	const [, deleteActivities] = useMutation(DELETE_ACTIVITIES_MUTATION);
	const [{ data, fetching }] = useQuery({
		query: RECENT_ACTIVITIES_QUERY,
		variables: { limit: 5, offset },
		requestPolicy: "cache-and-network",
	});

	// Subscribe to new activities — prepend them to the list in real-time
	useSubscription({ query: ACTIVITY_CREATED_SUBSCRIPTION }, (_prev, data) => {
		if (data?.activityCreated) {
			const newActivity = data.activityCreated;
			setLocalActivities((prev) => {
				if (prev.some((a) => a.id === newActivity.id)) {
					return prev;
				}
				return [newActivity, ...prev].slice(0, 5);
			});
		}
		return data;
	});

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
	const serverActivities = data?.activities ?? [];
	const seenIds = new Set(localActivities.map((a) => a.id));
	const recentActivities = [
		...localActivities,
		...serverActivities.filter((a) => !seenIds.has(a.id)),
	].slice(0, 5);

	if (!user) return null;

	const userName = user.name?.trim() || user.email.split("@")[0];
	const userInitial = userName.charAt(0).toUpperCase();

	const handleClearActivities = () => {
		const ids = recentActivities.map((a) => a.id);
		if (ids.length === 0) return;
		void deleteActivities({ ids });
		setLocalActivities([]);
		setOffset((prev) => prev + ids.length);
	};

	const formatActivityType = (type: ActivityType) => {
		if (type === ActivityType.Upload) return "File uploaded";
		if (type === ActivityType.Download) return "File downloaded";
		if (type === ActivityType.Delete) return "File deleted";
		if (type === ActivityType.Move) return "File moved";
		if (type === ActivityType.Update) return "File updated";
		if (type === ActivityType.Create) return "Created";
		if (type === ActivityType.Copy) return "Copied";
		if (type === ActivityType.Share) return "Shared";
		return "Unshared";
	};

	return (
		<>
			<div className="flex flex-col items-center gap-4 px-4">
				<div className="relative">
					<Avatar className="w-24 h-24 border-4 border-background">
						<AvatarImage src={`https://ui-avatars.com/api/?name=${userName}`} />
						<AvatarFallback>{userInitial}</AvatarFallback>
					</Avatar>
				</div>
				<div className="text-center">
					<h2 className="text-xl font-bold text-foreground">{userName}</h2>
					<p className="text-sm text-muted-foreground">{user.email}</p>
				</div>
				<Button
					className="w-full"
					size="lg"
					variant={"outline"}
					onClick={() => navigate({ to: "/settings" })}
				>
					<Settings2 size={16} className="mr-2" />
					<Trans>My Account</Trans>
				</Button>
			</div>

			<Separator />

			<div className="flex-1 overflow-y-auto">
				<div className="flex items-center justify-between mb-4 px-2">
					<h3 className="font-semibold">
						<Trans>Recent Activity</Trans>
					</h3>
					{recentActivities.length > 0 && (
						<Button
							size="sm"
							variant="ghost"
							className="h-7 text-xs text-muted-foreground"
							onClick={handleClearActivities}
							disabled={fetching}
						>
							Clear
						</Button>
					)}
				</div>
				<div>
					{fetching &&
						Array.from({ length: 3 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: skeleton items have no stable id
							<div key={i} className="space-y-2 py-2 px-3">
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
						const fileName =
							typeof activity.metadata?.name === "string"
								? activity.metadata.name
								: (activity.fileId ?? "System event");
						const fileSize =
							typeof activity.metadata?.size === "number"
								? formatBytes(activity.metadata.size)
								: null;
						const providerType = activity.provider?.type ?? null;
						const createdAt = new Date(activity.createdAt);
						const relativeTime = formatDistanceToNow(createdAt, {
							addSuffix: true,
						});
						const fullDate = createdAt.toLocaleString();

						return (
							<div
								key={activity.id}
								className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted transition-colors"
							>
								{/* Provider icon */}
								<div className="shrink-0 mt-0.5">
									{providerType ? (
										<ProviderIcon type={providerType} className="h-5 w-5" />
									) : (
										<div className="h-5 w-5 rounded-full bg-muted-foreground/20" />
									)}
								</div>

								{/* Details */}
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium leading-snug truncate">
										{formatActivityType(activity.type)}
									</p>
									<p className="text-xs text-muted-foreground truncate">
										{fileName}
									</p>
									<div className="flex items-center gap-2 mt-0.5 justify-between">
										<time
											dateTime={createdAt.toISOString()}
											title={fullDate}
											className="text-xs text-muted-foreground"
										>
											{relativeTime}
										</time>
										{fileSize && (
											<>
												<span className="text-muted-foreground/40 text-xs">
													·
												</span>
												<span className="text-xs text-muted-foreground">
													{fileSize}
												</span>
											</>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</>
	);
}

export function RightPanel() {
	const user = useAuthStore((state) => state.user);
	const content = useRightPanelStore((state) => state.content);
	const clearContent = useRightPanelStore((state) => state.clearContent);

	if (!user) return null;

	return (
		<div className="w-80 py-6 flex flex-col gap-8 shrink-0 relative">
			{content ? (
				<div className="relative px-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={clearContent}
						className="h-8 w-8 absolute right-4"
					>
						<X className="h-4 w-4" />
						<span className="sr-only">
							<Trans>Close panel</Trans>
						</span>
					</Button>
					<div className="flex-1 overflow-y-auto">{content}</div>
				</div>
			) : (
				<DefaultView />
			)}
		</div>
	);
}
