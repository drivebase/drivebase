import type { TransferJob, UploadBatch } from "@/gql/graphql";
import { FolderSync } from "lucide-react";
import { StatCard } from "./StatCard";

const ACTIVE = ["running", "pending"];

export function TransfersCard({
	uploads,
	transfers,
	loading,
}: {
	uploads: UploadBatch[];
	transfers: TransferJob[];
	loading: boolean;
}) {
	const activeUploads = uploads.filter((u) => ACTIVE.includes(u.status)).length;
	const activeTransfers = transfers.filter((t) => ACTIVE.includes(t.status)).length;
	const completed = transfers.filter((t) => t.status === "completed").length;
	const total = activeUploads + activeTransfers;

	return (
		<StatCard icon={<FolderSync size={18} />} label="Transfers" loading={loading}>
			<p className="text-2xl font-semibold text-foreground">{total}</p>
			<div className="flex items-center gap-3 mt-0.5">
				{total === 0 ? (
					<span className="text-xs text-muted">no active jobs</span>
				) : (
					<>
						{activeUploads > 0 && <span className="text-xs text-muted">{activeUploads} uploading</span>}
						{activeTransfers > 0 && <span className="text-xs text-muted">{activeTransfers} syncing</span>}
					</>
				)}
				{completed > 0 && <span className="text-xs text-muted">{completed} done</span>}
			</div>
		</StatCard>
	);
}
