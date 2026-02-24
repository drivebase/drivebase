import { Trans } from "@lingui/react/macro";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface FileManagementSettingsSectionProps {
	syncEnabled: boolean;
	canEdit: boolean;
	isSaving: boolean;
	onSyncToggle: (enabled: boolean) => void;
}

export function FileManagementSettingsSection(
	props: FileManagementSettingsSectionProps,
) {
	const { syncEnabled, canEdit, isSaving, onSyncToggle } = props;

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>File management</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Control how file and folder changes are applied.</Trans>
				</p>
			</div>

			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<Label className="text-base">
						<Trans>Sync</Trans>
					</Label>
					<p className="text-sm text-muted-foreground">
						<Trans>Apply move and rename changes on connected providers.</Trans>
					</p>
				</div>
				<Switch
					checked={syncEnabled}
					disabled={!canEdit || isSaving}
					onCheckedChange={onSyncToggle}
				/>
			</div>
		</div>
	);
}
