import { BandwidthCard } from "@/features/dashboard/BandwidthCard";
import { ProvidersCard } from "@/features/dashboard/ProvidersCard";
import { DashboardStatsQuery } from "@/features/dashboard/queries";
import { StorageCard } from "@/features/dashboard/StorageCard";
import { TransfersCard } from "@/features/dashboard/TransfersCard";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "urql";

export const Route = createFileRoute("/_authenticated/")({
	component: HomePage,
});

function HomePage() {
	const [{ data, fetching }] = useQuery({ query: DashboardStatsQuery });

	const providers = data?.providers ?? [];
	const bandwidth = data?.bandwidthUsage ?? [];
	const uploads = data?.myUploadBatches ?? [];
	const transfers = data?.myTransferJobs ?? [];

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-xl font-semibold text-foreground">Overview</h1>
			<div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
				<StorageCard providers={providers} loading={fetching} />
				<BandwidthCard bandwidth={bandwidth} loading={fetching} />
				<ProvidersCard providers={providers} loading={fetching} />
				<TransfersCard uploads={uploads} transfers={transfers} loading={fetching} />
			</div>
		</div>
	);
}
