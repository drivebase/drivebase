import { formatBytes } from "@/features/dashboard/utils";
import { ProviderStatus, ProviderType } from "@/gql/graphql";

type Provider = {
	id: string;
	name: string;
	type: ProviderType;
	status: ProviderStatus;
	quota?: { totalBytes: number; usedBytes: number; freeBytes: number } | null;
};
import { Button } from "@heroui/react";
import { AlertCircle, CheckCircle2, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { useMutation } from "urql";
import { DisconnectProviderMutation, ValidateProviderMutation } from "./mutations";
import { ProviderIcon } from "./ProviderIcon";

function StatusBadge({ status }: { status: ProviderStatus }) {
	if (status === ProviderStatus.Active)
		return <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 size={12} /> Active</span>;
	if (status === ProviderStatus.Error)
		return <span className="flex items-center gap-1 text-xs text-danger"><AlertCircle size={12} /> Error</span>;
	return <span className="flex items-center gap-1 text-xs text-muted"><WifiOff size={12} /> Disconnected</span>;
}

export function ProviderCard({
	provider,
	onRefetch,
}: {
	provider: Provider;
	onRefetch: () => void;
}) {
	const [{ fetching: validating }, validate] = useMutation(ValidateProviderMutation);
	const [{ fetching: disconnecting }, disconnect] = useMutation(DisconnectProviderMutation);

	const used = provider.quota?.usedBytes ?? 0;
	const total = provider.quota?.totalBytes ?? 0;
	const percent = total > 0 ? Math.round((used / total) * 100) : 0;

	async function handleValidate() {
		await validate({ id: provider.id });
		onRefetch();
	}

	async function handleDisconnect() {
		await disconnect({ id: provider.id });
		onRefetch();
	}

	return (
		<div className="rounded-xl border border-border bg-surface p-4 space-y-4">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-lg bg-default flex items-center justify-center shrink-0">
						<ProviderIcon type={provider.type} size={18} />
					</div>
					<div>
						<p className="text-sm font-medium text-foreground">{provider.name}</p>
						<StatusBadge status={provider.status} />
					</div>
				</div>
				<div className="flex items-center gap-1">
					<Button
						size="sm"
						variant="ghost"
						isIconOnly
						isPending={validating}
						onPress={handleValidate}
						aria-label="Validate"
					>
						<RefreshCw size={14} />
					</Button>
					<Button
						size="sm"
						variant="ghost"
						isIconOnly
						isPending={disconnecting}
						onPress={handleDisconnect}
						aria-label="Disconnect"
					>
						<Trash2 size={14} className="text-danger" />
					</Button>
				</div>
			</div>

			{total > 0 && (
				<div className="space-y-1.5">
					<div className="flex justify-between text-xs text-muted">
						<span>{formatBytes(used)} used</span>
						<span>{formatBytes(total)} total</span>
					</div>
					<div className="h-1.5 w-full rounded-full bg-default overflow-hidden">
						<div
							className="h-full rounded-full bg-accent transition-all"
							style={{ width: `${percent}%` }}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
