import { Database } from "lucide-react";
import { StatCard } from "./StatCard";

type ProviderStatus = { status: string };

export function ProvidersCard({ providers, loading }: { providers: ProviderStatus[]; loading: boolean }) {
	const active = providers.filter((p) => p.status === "active").length;
	const errors = providers.filter((p) => p.status === "error").length;

	return (
		<StatCard icon={<Database size={18} />} label="Providers" loading={loading}>
			<p className="text-2xl font-semibold text-foreground">{providers.length}</p>
			<div className="flex items-center gap-3 mt-0.5">
				<span className="text-xs text-muted">{active} active</span>
				{errors > 0 && <span className="text-xs text-danger">{errors} error</span>}
			</div>
		</StatCard>
	);
}
