import { Trans } from "@lingui/react/macro";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	type AppearancePresetId,
	appearancePresets,
	usePersonalizationStore,
} from "@/shared/store/personalizationStore";

const presetOrder: AppearancePresetId[] = [
	"none",
	"amethyst",
	"ocean",
	"sunset",
	"emerald",
];

function getAppearanceCopy(appearanceId: AppearancePresetId) {
	switch (appearanceId) {
		case "none":
			return {
				name: <Trans>None</Trans>,
				description: <Trans>Use the default workspace surface.</Trans>,
			};
		case "amethyst":
			return {
				name: <Trans>Amethyst Glow</Trans>,
				description: (
					<Trans>Soft violet highlights with a luminous studio feel.</Trans>
				),
			};
		case "ocean":
			return {
				name: <Trans>Ocean Mist</Trans>,
				description: (
					<Trans>Cool blues and teals for a crisp, focused workspace.</Trans>
				),
			};
		case "sunset":
			return {
				name: <Trans>Sunset Blend</Trans>,
				description: (
					<Trans>Warm orange and rose accents with extra energy.</Trans>
				),
			};
		case "emerald":
			return {
				name: <Trans>Emerald Air</Trans>,
				description: (
					<Trans>Fresh greens with a calm layered background.</Trans>
				),
			};
	}
}

export function AppearanceSettingsSection() {
	const appearanceId = usePersonalizationStore((state) => state.appearanceId);
	const setAppearanceId = usePersonalizationStore(
		(state) => state.setAppearanceId,
	);

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Appearance</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Pick a visual style for the dashboard background.</Trans>
				</p>
			</div>

			<div className="flex flex-wrap gap-4">
				{presetOrder.map((presetId) => {
					const preset = appearancePresets[presetId];
					const copy = getAppearanceCopy(presetId);
					const isSelected = appearanceId === presetId;
					const isNone = presetId === "none";

					return (
						<button
							key={presetId}
							type="button"
							onClick={() => setAppearanceId(presetId)}
							aria-pressed={isSelected}
							className="min-w-44 max-w-52 flex-none text-left"
						>
							<Card
								className={cn(
									"h-full overflow-hidden border transition-all",
									isSelected
										? "border-border ring-2 ring-primary/40"
										: "border-border/20 hover:border-primary/40",
								)}
							>
								<div
									className="relative h-32 bg-background/80"
									style={{
										backgroundImage: preset.backgroundImage,
										backgroundColor: isNone
											? "hsl(var(--background))"
											: undefined,
									}}
								>
									<div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/20 bg-background/55 p-3 backdrop-blur-md">
										<div className="mb-2 h-2.5 w-3/5 rounded-full bg-foreground/15" />
										<div className="grid grid-cols-3 gap-2">
											<div className="h-10 rounded-lg bg-background/75" />
											<div className="h-10 rounded-lg bg-background/55" />
											<div className="h-10 rounded-lg bg-background/35" />
										</div>
									</div>
								</div>
								<CardHeader>
									<CardTitle>{copy.name}</CardTitle>
									<CardDescription>{copy.description}</CardDescription>
								</CardHeader>
								<CardContent className="pt-0">
									<div className="text-xs text-muted-foreground">
										{isSelected ? (
											<Trans>Selected</Trans>
										) : (
											<Trans>Click to apply</Trans>
										)}
									</div>
								</CardContent>
							</Card>
						</button>
					);
				})}
			</div>
		</div>
	);
}
