type BandwidthSummary = { direction: string; totalBytes: number };
import { ArrowDownToLine, ArrowUpFromLine, Wifi } from "lucide-react";
import { StatCard } from "./StatCard";
import { formatBytes } from "./utils";

export function BandwidthCard({ bandwidth, loading }: { bandwidth: BandwidthSummary[]; loading: boolean }) {
	const uploadBw = bandwidth.filter((b) => b.direction === "upload").reduce((s, b) => s + b.totalBytes, 0);
	const downloadBw = bandwidth.filter((b) => b.direction === "download").reduce((s, b) => s + b.totalBytes, 0);

	return (
		<StatCard icon={<Wifi size={18} />} label="Bandwidth" loading={loading}>
			<div className="space-y-1.5">
				<div className="flex items-center gap-2">
					<ArrowUpFromLine size={13} className="text-muted shrink-0" />
					<span className="text-sm font-medium text-foreground">{formatBytes(uploadBw)}</span>
					<span className="text-xs text-muted">up</span>
				</div>
				<div className="flex items-center gap-2">
					<ArrowDownToLine size={13} className="text-muted shrink-0" />
					<span className="text-sm font-medium text-foreground">{formatBytes(downloadBw)}</span>
					<span className="text-xs text-muted">down</span>
				</div>
			</div>
		</StatCard>
	);
}
