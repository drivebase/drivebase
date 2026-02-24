import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock3,
	Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { JobStatus, type Job } from "@/gql/graphql";
import { useActivityStore } from "@/shared/store/activityStore";

function getStatusIcon(status: JobStatus) {
	if (status === JobStatus.Running) {
		return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
	}
	if (status === JobStatus.Pending) {
		return <Clock3 className="h-4 w-4 text-muted-foreground" />;
	}
	if (status === JobStatus.Completed) {
		return <CheckCircle2 className="h-4 w-4 text-green-600" />;
	}
	return <AlertCircle className="h-4 w-4 text-destructive" />;
}

function getStatusLabel(job: Job) {
	if (job.status === JobStatus.Running) {
		return "Running";
	}
	if (job.status === JobStatus.Pending) {
		return "Pending";
	}
	if (job.status === JobStatus.Completed) {
		return "Completed";
	}
	return "Error";
}

export function ActivityPanel() {
	const [expanded, setExpanded] = useState(true);
	const jobsMap = useActivityStore((state) => state.jobs);
	const clearCompleted = useActivityStore((state) => state.clearCompleted);

	const jobs = useMemo(
		() =>
			Array.from(jobsMap.values()).sort(
				(a, b) =>
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
			),
		[jobsMap],
	);

	if (jobs.length === 0) {
		return null;
	}

	const activeCount = jobs.filter(
		(job) =>
			job.status === JobStatus.Pending || job.status === JobStatus.Running,
	).length;

	if (!expanded) {
		return (
			<button
				type="button"
				onClick={() => setExpanded(true)}
				className="fixed right-6 bottom-6 z-50 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm shadow-lg"
			>
				{activeCount > 0 ? `${activeCount} active` : `${jobs.length} recent`}
				<ChevronUp className="h-4 w-4" />
			</button>
		);
	}

	return (
		<div className="fixed right-6 bottom-6 z-50 w-96 border bg-background shadow-2xl">
			<div className="flex items-center justify-between border-b px-4 py-3">
				<div className="text-sm font-semibold">Activity</div>
				<div className="flex items-center gap-2">
					<Button size="sm" variant="ghost" onClick={clearCompleted}>
						Clear
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						onClick={() => setExpanded(false)}
					>
						<ChevronDown className="h-4 w-4" />
					</Button>
				</div>
			</div>
			<div className="max-h-80 space-y-3 overflow-y-auto p-3">
				{jobs.map((job) => {
					const progress = Math.max(
						0,
						Math.min(100, Math.round(job.progress * 100)),
					);

					return (
						<div key={job.id} className="space-y-2">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<div className="truncate text-sm font-medium">
										{job.title}
									</div>
									<div className="text-xs text-muted-foreground">
										{job.message ?? getStatusLabel(job)}
									</div>
								</div>
								<div className="shrink-0">{getStatusIcon(job.status)}</div>
							</div>
							<Progress value={progress} className="h-1.5" />
							<div className="text-right text-xs text-muted-foreground">
								{progress}%
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
