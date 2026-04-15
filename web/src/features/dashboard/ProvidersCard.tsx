import { ProviderStatus, type Provider } from "@/gql/graphql";
import { Database } from "lucide-react";
import { StatCard } from "./StatCard";

export function ProvidersCard({ providers, loading }: { providers: Provider[]; loading: boolean }) {
	const active = providers.filter((p) => p.status === ProviderStatus.Active).length;
	const errors = providers.filter((p) => p.status === ProviderStatus.Error).length;

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
