import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock3,
	Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "urql";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type Job, JobStatus } from "@/gql/graphql";
import { CANCEL_TRANSFER_JOB_MUTATION } from "@/shared/api/activity";
import { confirmDialog } from "@/shared/lib/confirmDialog";
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

function getProgressIndicatorClass(status: JobStatus) {
	if (status === JobStatus.Error) return "bg-destructive";
	if (status === JobStatus.Completed) return "bg-emerald-600";
	return "bg-primary";
}

function getRetryLabel(job: Job): string | null {
	if (job.status !== JobStatus.Error || !job.metadata) return null;
	if (typeof job.metadata !== "object" || Array.isArray(job.metadata))
		return null;

	const retryAttempt = job.metadata.retryAttempt;
	const retryMax = job.metadata.retryMax;
	const willRetry = job.metadata.willRetry;
	if (
		typeof retryAttempt !== "number" ||
		typeof retryMax !== "number" ||
		typeof willRetry !== "boolean"
	) {
		return null;
	}

	return willRetry
		? `Retrying ${retryAttempt}/${retryMax}`
		: `Failed ${retryAttempt}/${retryMax}`;
}

export function ActivityPanel() {
	const [expanded, setExpanded] = useState(true);
	const [cancellingJobIds, setCancellingJobIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [, cancelTransferJob] = useMutation(CANCEL_TRANSFER_JOB_MUTATION);
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

	const handleCancelTransfer = async (job: Job) => {
		const confirmed = await confirmDialog(
			"Cancel transfer",
			`Cancel "${job.title}"? This will stop the provider transfer.`,
		);
		if (!confirmed) return;

		setCancellingJobIds((prev) => {
			const next = new Set(prev);
			next.add(job.id);
			return next;
		});
		try {
			const result = await cancelTransferJob({ jobId: job.id });
			if (result.error || !result.data?.cancelTransferJob) {
				throw new Error(result.error?.message ?? "Failed to cancel transfer");
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to cancel transfer",
			);
		} finally {
			setCancellingJobIds((prev) => {
				const next = new Set(prev);
				next.delete(job.id);
				return next;
			});
		}
	};

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
					const retryLabel = getRetryLabel(job);

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
								<div className="shrink-0 flex items-center gap-2">
									{job.type === "provider_transfer" &&
									(job.status === JobStatus.Pending ||
										job.status === JobStatus.Running) ? (
										<Button
											size="sm"
											variant="outline"
											onClick={() => void handleCancelTransfer(job)}
											disabled={cancellingJobIds.has(job.id)}
										>
											Cancel
										</Button>
									) : null}
									{getStatusIcon(job.status)}
								</div>
							</div>
							<Progress
								value={progress}
								className="h-1.5"
								indicatorClassName={getProgressIndicatorClass(job.status)}
							/>
							<div className="flex items-center justify-between text-xs text-muted-foreground">
								<span>{retryLabel ?? ""}</span>
								{progress}%
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
