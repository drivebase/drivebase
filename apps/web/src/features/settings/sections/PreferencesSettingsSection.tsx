import { Trans } from "@lingui/macro";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { locales } from "@/lib/i18n";
import { useLocaleStore } from "@/shared/store/localeStore";

export function PreferencesSettingsSection() {
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
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<Label className="text-base">
						<Trans>Theme</Trans>
					</Label>
					<p className="text-sm text-muted-foreground">
						<Trans>Choose light, dark, or system theme</Trans>
					</p>
				</div>
				<Select
					value={theme}
					onValueChange={(value) =>
						setTheme(value as "light" | "dark" | "system")
					}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="light">
							<span className="flex items-center gap-2">
								<Sun className="h-4 w-4" />
								<Trans>Light</Trans>
							</span>
						</SelectItem>
						<SelectItem value="dark">
							<span className="flex items-center gap-2">
								<Moon className="h-4 w-4" />
								<Trans>Dark</Trans>
							</span>
						</SelectItem>
						<SelectItem value="system">
							<span className="flex items-center gap-2">
								<Laptop className="h-4 w-4" />
								<Trans>System</Trans>
							</span>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

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