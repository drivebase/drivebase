import { Trans } from "@lingui/react/macro";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SmartSearchSectionProps {
	enabled: boolean;
	canEdit: boolean;
	isSaving: boolean;
	onToggle: (enabled: boolean) => void;
}

export function SmartSearchSection(props: SmartSearchSectionProps) {
	const { enabled, canEdit, isSaving, onToggle } = props;

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Smart Search</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>
						Extract text from documents and images for deep content search.
					</Trans>
				</p>
			</div>
			<div className="flex items-center gap-3 max-w-md">
				<Switch
					id="smart-search-toggle"
					checked={enabled}
					onCheckedChange={onToggle}
					disabled={!canEdit || isSaving}
				/>
				<Label htmlFor="smart-search-toggle" className="cursor-pointer">
					{enabled ? <Trans>Enabled</Trans> : <Trans>Disabled</Trans>}
				</Label>
			</div>
			{enabled && (
				<p className="text-xs text-muted-foreground">
					<Trans>
						Press Tab in the search palette (Cmd+K) to switch to Smart Search
						mode.
					</Trans>
				</p>
			)}
		</div>
	);
}
