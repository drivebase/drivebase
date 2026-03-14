import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { useMutation } from "urql";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { JobStatus } from "@/gql/graphql";
import { RESOLVE_JOB_PAUSE_MUTATION } from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";
import { toast } from "sonner";

export function JobConflictDialog() {
	const jobsMap = useActivityStore((state) => state.jobs);
	const [, resolveJob] = useMutation(RESOLVE_JOB_PAUSE_MUTATION);
	const [applyToAll, setApplyToAll] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Find the first paused job
	const pausedJob = useMemo(() => {
		for (const job of jobsMap.values()) {
			if (job.status === JobStatus.Paused) {
				const meta = job.metadata as Record<string, unknown> | null;
				if (meta?.phase === "conflict") {
					return job;
				}
			}
		}
		return null;
	}, [jobsMap]);

	if (!pausedJob) return null;

	const meta = pausedJob.metadata as Record<string, unknown>;
	const fileName = (meta.fileName as string) || "the file";

	const handleResolve = async (action: "overwrite" | "skip") => {
		setIsSubmitting(true);
		try {
			const result = await resolveJob({
				jobId: pausedJob.id,
				resolution: { action, applyToAll },
			});
			if (result.error) {
				throw new Error(result.error.message);
			}
			// Reset local state for next potential conflict
			setApplyToAll(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : t`Failed to resolve conflict`,
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={() => {}}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						<Trans>File already exists</Trans>
					</DialogTitle>
					<DialogDescription>
						A file named <strong>{fileName}</strong> already exists at the
						destination. Do you want to overwrite it or skip this file?
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center space-x-2 py-4">
					<Checkbox
						id="apply-all"
						checked={applyToAll}
						onCheckedChange={(checked) => setApplyToAll(checked === true)}
					/>
					<label
						htmlFor="apply-all"
						className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						<Trans>Do this for all remaining conflicts</Trans>
					</label>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						onClick={() => void handleResolve("skip")}
						disabled={isSubmitting}
					>
						<Trans>Skip</Trans>
					</Button>
					<Button
						variant="default"
						onClick={() => void handleResolve("overwrite")}
						disabled={isSubmitting}
					>
						<Trans>Overwrite</Trans>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
