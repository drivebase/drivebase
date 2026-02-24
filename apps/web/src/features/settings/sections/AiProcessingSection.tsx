import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAiSettingsStore } from "@/features/ai/store/aiSettingsStore";

interface AiProcessingSectionProps {
	isUpdating: boolean;
	onToggle: (enabled: boolean) => void;
}

export function AiProcessingSection({
	isUpdating,
	onToggle,
}: AiProcessingSectionProps) {
	const canManageWorkspace = useAiSettingsStore(
		(state) => state.canManageWorkspace,
	);
	const settings = useAiSettingsStore((state) => state.settings);

	return (
		<>
			<section className="space-y-4">
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-1">
						<h3 className="text-lg font-medium">AI Processing</h3>
						<p className="text-sm text-muted-foreground">
							Turn AI processing on or off for this workspace.
						</p>
					</div>
					<Switch
						checked={Boolean(settings?.enabled)}
						disabled={!canManageWorkspace || isUpdating}
						onCheckedChange={onToggle}
					/>
				</div>
			</section>
			<Separator />
		</>
	);
}
