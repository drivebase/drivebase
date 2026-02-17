import { formatBytes } from "@drivebase/utils";
import {
	AlertCircle,
	CheckCircle2,
	Info,
	Link2,
	MoreVertical,
	RefreshCw,
	Settings,
	Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { AuthType, type StorageProvider } from "@/gql/graphql";
import { cn } from "@/shared/lib/utils";
import { ProviderIcon } from "./ProviderIcon";

interface ConnectedProviderCardProps {
	provider: StorageProvider;
	onDisconnect: (id: string) => void;
	onQuota: (provider: StorageProvider) => void;
	onInfo: (provider: StorageProvider) => void;
	onSync: (provider: StorageProvider) => void;
	canManageProviders: boolean;
	isDisconnecting: boolean;
	isSyncing?: boolean;
	onReconnect?: (id: string) => void;
	isReconnecting?: boolean;
}

export function ConnectedProviderCard({
	provider,
	onDisconnect,
	onQuota,
	onInfo,
	onSync,
	canManageProviders,
	isDisconnecting,
	isSyncing,
	onReconnect,
	isReconnecting,
}: ConnectedProviderCardProps) {
	const usagePercent = provider.quotaTotal
		? Math.min((provider.quotaUsed / provider.quotaTotal) * 100, 100)
		: 0;

	return (
		<Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-muted rounded-md">
						<ProviderIcon type={provider.type} className="h-6 w-6" />
					</div>
					<div>
						<CardTitle className="text-base font-semibold leading-none">
							{provider.name}
						</CardTitle>
						<div className="text-xs text-muted-foreground mt-1 capitalize">
							{provider.type.toLowerCase().replace("_", " ")}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge
						variant={provider.isActive ? "secondary" : "destructive"}
						className={cn(
							"gap-1.5",
							provider.isActive &&
								"bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
						)}
					>
						{provider.isActive ? (
							<>
								<CheckCircle2 size={12} />
								Active
							</>
						) : (
							<>
								<AlertCircle size={12} />
								Error
							</>
						)}
					</Badge>

					{canManageProviders ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<MoreVertical className="h-4 w-4" />
									<span className="sr-only">Open menu</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Actions</DropdownMenuLabel>
								<DropdownMenuItem onClick={() => onInfo(provider)}>
									<Info className="mr-2 h-4 w-4" /> View
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => onSync(provider)}
									disabled={isSyncing}
								>
									<RefreshCw className="mr-2 h-4 w-4" /> Sync
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => onQuota(provider)}>
									<Settings className="mr-2 h-4 w-4" /> Quota
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() => onDisconnect(provider.id)}
									disabled={isDisconnecting}
								>
									<Trash2 className="mr-2 h-4 w-4" /> Disconnect
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>
			</CardHeader>

			<CardContent className="mt-4 space-y-4">
				{/* Quota Usage */}
				<div className="space-y-2">
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>Storage Usage</span>
						<span>
							{provider.quotaTotal
								? `${formatBytes(provider.quotaUsed)} of ${formatBytes(provider.quotaTotal)}`
								: formatBytes(provider.quotaUsed)}
						</span>
					</div>
					{provider.quotaTotal ? (
						<Progress value={usagePercent} className="h-2" />
					) : (
						<div className="h-2 bg-muted rounded-full overflow-hidden" />
					)}
				</div>

				{/* Reconnect Action if needed */}
				{!provider.isActive &&
					provider.authType === AuthType.Oauth &&
					canManageProviders &&
					onReconnect && (
						<Button
							variant="outline"
							size="sm"
							className="w-full border-destructive text-destructive hover:bg-destructive/10"
							onClick={() => onReconnect(provider.id)}
							disabled={isReconnecting || isDisconnecting}
						>
							<Link2 className="h-4 w-4 mr-2" />
							{isReconnecting ? "Connecting..." : "Reconnect Account"}
						</Button>
					)}
			</CardContent>
		</Card>
	);
}
