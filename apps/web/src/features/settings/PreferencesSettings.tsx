import { Trans } from "@lingui/macro";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { locales } from "@/lib/i18n";
import { useLocaleStore } from "@/shared/store/localeStore";

export function PreferencesSettings() {
	const { theme, setTheme } = useTheme();
	const { locale, setLocale } = useLocaleStore();

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Appearance</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>
						Customize the appearance of the application. Automatically switch
						between day and night themes.
					</Trans>
				</p>
			</div>
			<div className="border-t border-border" />
			<div className="space-y-4">
				<Label className="text-base">
					<Trans>Theme</Trans>
				</Label>
				<RadioGroup
					defaultValue={theme}
					onValueChange={(value) =>
						setTheme(value as "light" | "dark" | "system")
					}
					className="grid grid-cols-3 gap-4"
				>
					<div>
						<RadioGroupItem value="light" id="light" className="peer sr-only" />
						<Label
							htmlFor="light"
							className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:border-accent transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
						>
							<Sun className="mb-3 h-6 w-6" />
							<Trans>Light</Trans>
						</Label>
					</div>
					<div>
						<RadioGroupItem value="dark" id="dark" className="peer sr-only" />
						<Label
							htmlFor="dark"
							className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:border-accent transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
						>
							<Moon className="mb-3 h-6 w-6" />
							<Trans>Dark</Trans>
						</Label>
					</div>
					<div>
						<RadioGroupItem
							value="system"
							id="system"
							className="peer sr-only"
						/>
						<Label
							htmlFor="system"
							className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:border-accent transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
						>
							<Laptop className="mb-3 h-6 w-6" />
							<Trans>System</Trans>
						</Label>
					</div>
				</RadioGroup>
			</div>

			<div className="border-t border-border" />

			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<Label className="text-base">
						<Trans>Language</Trans>
					</Label>
					<p className="text-sm text-muted-foreground">
						<Trans>Choose your preferred language</Trans>
					</p>
				</div>
				<Select value={locale} onValueChange={(value) => setLocale(value)}>
					<SelectTrigger className="w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{Object.entries(locales).map(([code, name]) => (
							<SelectItem key={code} value={code}>
								<span className="flex items-center gap-2">
									<span>{code === "en" ? "🇺🇸" : "🇪🇸"}</span>
									{name}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
