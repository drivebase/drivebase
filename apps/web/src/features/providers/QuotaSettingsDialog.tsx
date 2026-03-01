import { Loader2, Save } from "@/shared/components/icons/solar";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StorageProvider } from "@/gql/graphql";

const BYTES_IN_GB = 1024 ** 3;

interface QuotaSettingsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	provider: StorageProvider | null;
	isSaving?: boolean;
	onSave: (input: {
		id: string;
		quotaTotal: number;
		quotaUsed: number;
	}) => Promise<void>;
}

function toGb(value: number): string {
	return (value / BYTES_IN_GB).toFixed(2);
}

export function QuotaSettingsDialog({
	isOpen,
	onClose,
	provider,
	isSaving,
	onSave,
}: QuotaSettingsDialogProps) {
	const [totalGb, setTotalGb] = useState("0");
	const [leftGb, setLeftGb] = useState("0");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!provider) return;

		const totalBytes = provider.quotaTotal ?? provider.quotaUsed;
		const leftBytes = Math.max(totalBytes - provider.quotaUsed, 0);

		setTotalGb(toGb(totalBytes));
		setLeftGb(toGb(leftBytes));
		setError(null);
	}, [provider]);

	const handleSave = async () => {
		if (!provider) return;

		const total = Number(totalGb);
		const left = Number(leftGb);

		if (!Number.isFinite(total) || !Number.isFinite(left)) {
			setError("Quota values must be valid numbers.");
			return;
		}

		if (total < 0 || left < 0) {
			setError("Quota values cannot be negative.");
			return;
		}

		if (left > total) {
			setError("Storage left cannot exceed total quota.");
			return;
		}

		const totalBytes = Math.round(total * BYTES_IN_GB);
		const usedBytes = Math.max(totalBytes - Math.round(left * BYTES_IN_GB), 0);

		setError(null);
		await onSave({
			id: provider.id,
			quotaTotal: totalBytes,
			quotaUsed: usedBytes,
		});
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Quota Settings</DialogTitle>
					<DialogDescription>
						Manage quota values for {provider?.name ?? "this provider"}.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="totalGb">Total quota (GB)</Label>
						<Input
							id="totalGb"
							type="number"
							min="0"
							step="0.01"
							value={totalGb}
							onChange={(e) => setTotalGb(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="leftGb">Storage left (GB)</Label>
						<Input
							id="leftGb"
							type="number"
							min="0"
							step="0.01"
							value={leftGb}
							onChange={(e) => setLeftGb(e.target.value)}
						/>
					</div>

					{error ? <p className="text-xs text-destructive">{error}</p> : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						onClick={handleSave}
						disabled={!provider || isSaving}
					>
						{isSaving ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Save className="mr-2 h-4 w-4" />
						)}
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
