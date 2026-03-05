import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type CronPreset = "custom" | "every-day" | "weekend";

interface WorkspaceAutoSyncSectionProps {
	enabled: boolean;
	cron: string;
	scope: "ALL" | "SELECTED";
	selectedProviderIds: string[];
	providers: Array<{ id: string; name: string; isActive: boolean }>;
	canEdit: boolean;
	isSaving: boolean;
	onEnabledChange: (enabled: boolean) => void;
	onCronChange: (cron: string) => void;
	onScopeChange: (scope: "ALL" | "SELECTED") => void;
	onProviderToggle: (providerId: string, selected: boolean) => void;
	onSave: () => void;
}

export function WorkspaceAutoSyncSection(props: WorkspaceAutoSyncSectionProps) {
	const {
		enabled,
		cron,
		scope,
		selectedProviderIds,
		providers,
		canEdit,
		isSaving,
		onEnabledChange,
		onCronChange,
		onScopeChange,
		onProviderToggle,
		onSave,
	} = props;

	const disabled = !canEdit || isSaving;
	const activeProviders = providers.filter((provider) => provider.isActive);
	const [cronPreset, setCronPreset] = useState<CronPreset>("custom");

	const handlePresetChange = (value: CronPreset) => {
		setCronPreset(value);
		if (value === "every-day") {
			onCronChange("0 0 * * *");
			return;
		}

		if (value === "weekend") {
			onCronChange("0 0 * * 0,6");
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Auto sync</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Run provider sync automatically using a cron schedule.</Trans>
				</p>
			</div>

			<div className="flex items-center gap-3 max-w-md">
				<Switch
					id="workspace-auto-sync-toggle"
					checked={enabled}
					onCheckedChange={onEnabledChange}
					disabled={disabled}
				/>
				<Label htmlFor="workspace-auto-sync-toggle" className="cursor-pointer">
					{enabled ? <Trans>Enabled</Trans> : <Trans>Disabled</Trans>}
				</Label>
			</div>

			<div className="space-y-4 max-w-xl">
				{enabled && (
					<>
						<div className="space-y-2">
							<Label htmlFor="workspace-auto-sync-cron">
								<Trans>Cron schedule (UTC)</Trans>
							</Label>
							<div className="flex items-center gap-2">
								<Input
									id="workspace-auto-sync-cron"
									placeholder="0 * * * *"
									value={cron}
									onChange={(event) => {
										setCronPreset("custom");
										onCronChange(event.target.value);
									}}
									disabled={disabled}
									className="flex-1"
								/>
								<Select
									value={cronPreset}
									onValueChange={(value) =>
										handlePresetChange(value as CronPreset)
									}
									disabled={disabled}
								>
									<SelectTrigger className="w-40">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="custom">
											<Trans>Custom</Trans>
										</SelectItem>
										<SelectItem value="every-day">
											<Trans>Every day</Trans>
										</SelectItem>
										<SelectItem value="weekend">
											<Trans>On weekend</Trans>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<p className="text-xs text-muted-foreground">
								<Trans>Need help building a cron expression?</Trans>{" "}
								<a
									href="https://crontab.guru"
									target="_blank"
									rel="noreferrer"
									className="underline"
								>
									<Trans>Open Cron Guru</Trans>
								</a>
							</p>
						</div>

						<div className="space-y-2">
							<Label>
								<Trans>Provider scope</Trans>
							</Label>
							<Select
								value={scope}
								onValueChange={(value) =>
									onScopeChange(value as "ALL" | "SELECTED")
								}
								disabled={disabled}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ALL">
										<Trans>All providers</Trans>
									</SelectItem>
									<SelectItem value="SELECTED">
										<Trans>Selected providers</Trans>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{scope === "SELECTED" && (
							<div className="space-y-2">
								<Label>
									<Trans>Providers</Trans>
								</Label>
								<div className="space-y-2 border border-border rounded-md p-3">
									{activeProviders.length > 0 ? (
										activeProviders.map((provider) => {
											const checked = selectedProviderIds.includes(provider.id);
											return (
												<div
													key={provider.id}
													className="flex items-center gap-2 text-sm"
												>
													<Checkbox
														checked={checked}
														onCheckedChange={(value) =>
															onProviderToggle(provider.id, value === true)
														}
														disabled={disabled}
													/>
													<span>{provider.name}</span>
												</div>
											);
										})
									) : (
										<p className="text-xs text-muted-foreground">
											<Trans>No active providers found.</Trans>
										</p>
									)}
								</div>
							</div>
						)}
					</>
				)}

				<div>
					<Button onClick={onSave} disabled={disabled}>
						{isSaving ? <Trans>Saving...</Trans> : <Trans>Save</Trans>}
					</Button>
				</div>
			</div>
		</div>
	);
}
