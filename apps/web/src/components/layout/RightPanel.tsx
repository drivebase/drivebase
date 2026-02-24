import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import {
	ArrowDownToLine,
	ArrowUpToLine,
	FolderInput,
	MoveRight,
	Settings2,
	Trash2,
	X,
} from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "urql";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ActivityType, JobStatus } from "@/gql/graphql";
import { RECENT_ACTIVITIES_QUERY } from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";
import { useRightPanelStore } from "@/shared/store/rightPanelStore";

function DefaultView() {
	const user = useAuthStore((state) => state.user);
	const navigate = useNavigate();
	const jobsMap = useActivityStore((state) => state.jobs);
	const [{ data, fetching }] = useQuery({
		query: RECENT_ACTIVITIES_QUERY,
		variables: { limit: 5, offset: 0 },
		requestPolicy: "cache-and-network",
	});

	if (!user) return null;

	const userName = user.name?.trim() || user.email.split("@")[0];
	const userInitial = userName.charAt(0).toUpperCase();
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
	const recentActivities = data?.activities ?? [];

	const formatActivityType = (type: ActivityType) => {
		if (type === ActivityType.Upload) return "Upload requested";
		if (type === ActivityType.Download) return "Download requested";
		if (type === ActivityType.Delete) return "File deleted";
		if (type === ActivityType.Move) return "File moved";
		if (type === ActivityType.Update) return "File updated";
		if (type === ActivityType.Create) return "Created";
		if (type === ActivityType.Copy) return "Copied";
		if (type === ActivityType.Share) return "Shared";
		return "Unshared";
	};

	const getActivityIcon = (type: ActivityType) => {
		if (type === ActivityType.Upload) return <ArrowUpToLine size={14} />;
		if (type === ActivityType.Download) return <ArrowDownToLine size={14} />;
		if (type === ActivityType.Delete) return <Trash2 size={14} />;
		if (type === ActivityType.Move) return <MoveRight size={14} />;
		return <FolderInput size={14} />;
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
				<div className="flex items-center justify-between mb-4 px-4">
					<h3 className="font-semibold">
						<Trans>Recent Activity</Trans>
					</h3>
				</div>
				<div className="px-1">
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
					{recentActivities.map((activity) => (
						<div
							key={activity.id}
							className="p-3 hover:bg-muted transition-colors"
						>
							<p className="text-sm font-medium leading-snug line-clamp-1 flex items-center gap-2">
								{getActivityIcon(activity.type)}
								{formatActivityType(activity.type)}
							</p>
							<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
								{typeof activity.metadata?.name === "string"
									? activity.metadata.name
									: activity.fileId
										? `File ID: ${activity.fileId}`
										: "System event"}
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								{new Date(activity.createdAt).toLocaleString()}
							</p>
						</div>
					))}
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
