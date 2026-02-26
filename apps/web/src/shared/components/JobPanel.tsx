import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock3,
	Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "urql";
import { getActiveWorkspaceId } from "@/features/workspaces";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type Job, JobStatus } from "@/gql/graphql";
import { CANCEL_TRANSFER_JOB_MUTATION } from "@/shared/api/activity";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import { useActivityStore } from "@/shared/store/activityStore";
import {
	getHiddenJobKey,
	getHiddenJobsStorageKey,
	getInitialHiddenJobs,
	getProgressIndicatorClass,
	getRetryLabel,
	getStatusLabel,
	isTerminalJob,
	type HiddenJobsMap,
} from "./jobPanelUtils";

const JOB_PANEL_EXPANDED_STORAGE_KEY = "job_panel_expanded";

function getInitialExpandedState(): boolean {
	const stored = localStorage.getItem(JOB_PANEL_EXPANDED_STORAGE_KEY);
	if (stored === "false") return false;
	return true;
}

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

export function JobPanel() {
	const workspaceId = getActiveWorkspaceId();
	const [expanded, setExpanded] = useState(getInitialExpandedState);
	const [cancellingJobIds, setCancellingJobIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [hiddenJobs, setHiddenJobs] = useState<HiddenJobsMap>(() =>
		getInitialHiddenJobs(workspaceId),
	);
	const [, cancelTransferJob] = useMutation(CANCEL_TRANSFER_JOB_MUTATION);
	const jobsMap = useActivityStore((state) => state.jobs);

	const jobs = useMemo(
		() =>
			Array.from(jobsMap.values())
				.sort(
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				)
				.slice(0, 50),
		[jobsMap],
	);
	const visibleJobs = useMemo(
		() =>
			jobs.filter((job) => {
				if (!isTerminalJob(job)) return true;
				return hiddenJobs[getHiddenJobKey(job)] !== true;
			}),
		[jobs, hiddenJobs],
	);

	useEffect(() => {
		localStorage.setItem(
			getHiddenJobsStorageKey(workspaceId),
			JSON.stringify(hiddenJobs),
		);
	}, [hiddenJobs, workspaceId]);

	useEffect(() => {
		setHiddenJobs(getInitialHiddenJobs(workspaceId));
	}, [workspaceId]);

	if (visibleJobs.length === 0) {
		return null;
	}

	const activeCount = visibleJobs.filter(
		(job) =>
			job.status === JobStatus.Pending || job.status === JobStatus.Running,
	).length;

	const setExpandedPersisted = (next: boolean) => {
		setExpanded(next);
		localStorage.setItem(
			JOB_PANEL_EXPANDED_STORAGE_KEY,
			next ? "true" : "false",
		);
	};

	const clearPanelCompleted = () => {
		setHiddenJobs((prev) => {
			const next: HiddenJobsMap = { ...prev };
			for (const job of visibleJobs) {
				if (isTerminalJob(job)) {
					next[getHiddenJobKey(job)] = true;
				}
			}
			return next;
		});
	};

	if (!expanded) {
		return (
			<button
				type="button"
				onClick={() => setExpandedPersisted(true)}
				className="fixed right-6 bottom-6 z-50 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm shadow-lg"
			>
				{activeCount > 0
					? `${activeCount} active`
					: `${visibleJobs.length} recent`}
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
				<div className="text-sm font-semibold">Jobs</div>
				<div className="flex items-center gap-2">
					<Button size="sm" variant="ghost" onClick={clearPanelCompleted}>
						Clear
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						onClick={() => setExpandedPersisted(false)}
					>
						<ChevronDown className="h-4 w-4" />
					</Button>
				</div>
			</div>
			<div className="max-h-80 space-y-3 overflow-y-auto p-3">
				{visibleJobs.map((job) => {
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
