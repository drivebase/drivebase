import { PiSpinnerGap as Loader2 } from "react-icons/pi";
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

interface FilesSettingsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	syncEnabled: boolean;
	canManageSettings: boolean;
	isSaving: boolean;
	onSyncToggle: (enabled: boolean) => void;
}

export function FilesSettingsDialog({
	isOpen,
	onClose,
	syncEnabled,
	canManageSettings,
	isSaving,
	onSyncToggle,
}: FilesSettingsDialogProps) {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Files settings</DialogTitle>
					<DialogDescription>
						Configure behavior for file and folder operations in this workspace.
					</DialogDescription>
				</DialogHeader>

				<div className="py-2">
					<div className="flex items-center justify-between space-x-4">
						<div className="space-y-1">
							<Label className="text-base">Sync</Label>
							<p className="max-w-70 text-sm text-muted-foreground">
								Apply move and rename changes.
							</p>
						</div>
						{isSaving ? (
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						) : (
							<Switch
								checked={syncEnabled}
								disabled={!canManageSettings}
								onCheckedChange={onSyncToggle}
							/>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
