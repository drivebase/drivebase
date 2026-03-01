import { formatBytes } from "@drivebase/utils";
import { Trans } from "@lingui/react/macro";
import {
	Activity,
	Files,
	HardDrive,
	type LucideIcon,
	Server,
} from "@/shared/components/icons/solar";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardStats = {
	totalFiles: number;
	totalSizeBytes: number;
	bandwidthBytes: number;
	totalProviders: number;
};

export interface DashboardStatsSectionProps {
	stats: DashboardStats | null;
	isLoading: boolean;
}

type StatCard = {
	id: string;
	title: React.ReactNode;
	value: string;
	icon: LucideIcon;
	iconClassName: string;
};

export function DashboardStatsSection({
	stats,
	isLoading,
}: DashboardStatsSectionProps) {
	const statCards: StatCard[] = [
		{
			id: "total-files",
			title: <Trans>Total Files</Trans>,
			value: stats ? stats.totalFiles.toLocaleString() : "0",
			icon: Files,
			iconClassName: "bg-cyan-500/15 text-cyan-700",
		},
		{
			id: "total-size",
			title: <Trans>Total Size</Trans>,
			value: stats ? formatBytes(stats.totalSizeBytes) : formatBytes(0),
			icon: HardDrive,
			iconClassName: "bg-emerald-500/15 text-emerald-700",
		},
		{
			id: "today-bandwidth",
			title: <Trans>Today Bandwidth</Trans>,
			value: stats ? formatBytes(stats.bandwidthBytes) : formatBytes(0),
			icon: Activity,
			iconClassName: "bg-orange-500/15 text-orange-700",
		},
		{
			id: "total-providers",
			title: <Trans>Total Providers</Trans>,
			value: stats ? stats.totalProviders.toLocaleString() : "0",
			icon: Server,
			iconClassName: "bg-violet-500/15 text-violet-700",
		},
	];

	return (
		<section>
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
				{isLoading && !stats
					? Array.from({ length: 4 }).map((_, idx) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading
								key={idx}
								className="h-[136px] border p-5"
							>
								<div className="h-full flex flex-col justify-between">
									<div className="flex items-center gap-3">
										<Skeleton className="h-9 w-9" />
										<Skeleton className="h-3 w-24" />
									</div>
									<Skeleton className="h-10 w-32" />
								</div>
							</div>
						))
					: statCards.map((card) => {
							const Icon = card.icon;
							return (
								<div key={card.id} className="h-[136px] border p-5">
									<div className="h-full flex flex-col justify-between">
										<div className="flex items-center gap-3">
											<div
												className={`h-9 w-9 grid place-items-center ${card.iconClassName}`}
											>
												<Icon className="h-5 w-5" />
											</div>
											<p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
												{card.title}
											</p>
										</div>
										<p className="text-4xl leading-none font-bold text-foreground tabular-nums">
											{card.value}
										</p>
									</div>
								</div>
							);
						})}
			</div>
		</section>
	);
}
