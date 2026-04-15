import { ConnectProviderModal } from "@/features/providers/ConnectProviderModal";
import { ProviderCard } from "@/features/providers/ProviderCard";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import { AvailableProvidersQuery, ProvidersQuery } from "@/features/providers/queries";
import { type AvailableProvider } from "@/gql/graphql";
import { Button } from "@heroui/react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "urql";

export const Route = createFileRoute("/_authenticated/providers")({
	component: ProvidersPage,
});

function ProvidersPage() {
	const [{ data: connectedData, fetching }, refetch] = useQuery({ query: ProvidersQuery });
	const [{ data: availableData }] = useQuery({ query: AvailableProvidersQuery });
	const [connecting, setConnecting] = useState<AvailableProvider | null>(null);

	const providers = connectedData?.providers ?? [];
	const available = availableData?.availableProviders ?? [];

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold text-foreground">Providers</h1>
					<p className="text-sm text-muted mt-0.5">Manage your connected storage providers</p>
				</div>
				{available.length > 0 && (
					<Button onPress={() => setConnecting(available[0])} size="sm">
						<Plus size={15} />
						Connect provider
					</Button>
				)}
			</div>

			{/* Connected providers */}
			{fetching ? (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{[1, 2].map((i) => (
						<div key={i} className="h-32 rounded-xl border border-border bg-surface animate-pulse" />
					))}
				</div>
			) : providers.length > 0 ? (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{providers.map((p) => (
						<ProviderCard key={p.id} provider={p} onRefetch={() => refetch({ requestPolicy: "network-only" })} />
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<p className="text-sm font-medium text-foreground">No providers connected</p>
					<p className="text-xs text-muted mt-1 mb-4">Connect a storage provider to start managing files</p>
				</div>
			)}

			{/* Available providers to connect */}
			{available.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-sm font-medium text-muted uppercase tracking-wide">Available providers</h2>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{available.map((ap) => (
							<AvailableProviderCard
								key={ap.type}
								provider={ap}
								onConnect={() => setConnecting(ap)}
							/>
						))}
					</div>
				</div>
			)}

			{connecting && (
				<ConnectProviderModal
					provider={connecting}
					onClose={() => setConnecting(null)}
					onConnected={() => {
						setConnecting(null);
						refetch({ requestPolicy: "network-only" });
					}}
				/>
			)}
		</div>
	);
}

function AvailableProviderCard({
	provider,
	onConnect,
}: {
	provider: AvailableProvider;
	onConnect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onConnect}
			className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:bg-default/40 transition-colors group"
		>
			<div className="w-9 h-9 rounded-lg bg-default flex items-center justify-center shrink-0">
				<ProviderIcon type={provider.type} size={18} />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-foreground">{provider.label}</p>
				<p className="text-xs text-muted truncate">{provider.description}</p>
			</div>
			<Plus size={15} className="text-muted group-hover:text-foreground transition-colors shrink-0" />
		</button>
	);
}
