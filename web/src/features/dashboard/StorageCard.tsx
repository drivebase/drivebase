import { HardDrive } from "lucide-react";
import { StatCard } from "./StatCard";
import { formatBytes } from "./utils";

type ProviderWithQuota = { quota?: { totalBytes: number; usedBytes: number } | null };

export function StorageCard({ providers, loading }: { providers: ProviderWithQuota[]; loading: boolean }) {
	const totalStorage = providers.reduce((s, p) => s + (p.quota?.totalBytes ?? 0), 0);
	const usedStorage = providers.reduce((s, p) => s + (p.quota?.usedBytes ?? 0), 0);
	const storagePercent = totalStorage > 0 ? Math.round((usedStorage / totalStorage) * 100) : 0;

	return (
		<StatCard icon={<HardDrive size={18} />} label="Storage used" loading={loading}>
			<p className="text-2xl font-semibold text-foreground">{formatBytes(usedStorage)}</p>
			<p className="text-xs text-muted mt-0.5">
				of {formatBytes(totalStorage)} across {providers.length} provider{providers.length !== 1 ? "s" : ""}
			</p>
			{totalStorage > 0 && (
				<div className="mt-3 h-1.5 w-full rounded-full bg-default overflow-hidden">
					<div
						className="h-full rounded-full bg-accent transition-all"
						style={{ width: `${storagePercent}%` }}
					/>
				</div>
			)}
		</StatCard>
	);
}
