import { useState } from "react";
import { PiArrowsClockwise as RefreshCw } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { StorageProvider, SyncOptionsInput } from "@/gql/graphql";

interface SyncProviderDialogProps {
	provider: StorageProvider | null;
	isOpen: boolean;
	onClose: () => void;
	onSync: (id: string, options: SyncOptionsInput) => Promise<void>;
	isSyncing: boolean;
}

export function SyncProviderDialog({
	provider,
	isOpen,
	onClose,
	onSync,
	isSyncing,
}: SyncProviderDialogProps) {
	const [options, setOptions] = useState<SyncOptionsInput>({
		recursive: true,
		pruneDeleted: true,
	});

	if (!provider) return null;

	const handleSync = async () => {
		onClose();
		await onSync(provider.id, options);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-width-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<RefreshCw className="h-5 w-5" />
						Sync Provider
					</DialogTitle>
					<DialogDescription>
						Configure how you want to synchronize files from {provider.name}.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-6 py-4">
					<div className="flex items-center justify-between space-x-4">
						<div className="flex flex-col space-y-1">
							<Label htmlFor="recursive">Recursive Sync</Label>
							<p className="text-xs text-muted-foreground">
								Sync all subfolders and files recursively.
							</p>
						</div>
						<Switch
							id="recursive"
							checked={options.recursive ?? true}
							onCheckedChange={(checked) =>
								setOptions((prev) => ({ ...prev, recursive: checked }))
							}
							disabled={isSyncing}
						/>
					</div>

					<div className="flex items-center justify-between space-x-4">
						<div className="flex flex-col space-y-1">
							<Label htmlFor="prune">Prune Deleted</Label>
							<p className="text-xs text-muted-foreground">
								Remove files from local DB that are no longer in the provider.
							</p>
						</div>
						<Switch
							id="prune"
							checked={options.pruneDeleted ?? true}
							onCheckedChange={(checked) =>
								setOptions((prev) => ({ ...prev, pruneDeleted: checked }))
							}
							disabled={isSyncing}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isSyncing}>
						Cancel
					</Button>
					<Button onClick={handleSync} disabled={isSyncing}>
						{isSyncing ? (
							<>
								<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
								Syncing...
							</>
						) : (
							"Start Sync"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
