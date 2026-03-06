import { Trans } from "@lingui/react/macro";
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

const languageFlags: Record<string, string> = {
	en: "🇺🇸",
	es: "🇪🇸",
	ar: "🇸🇦",
};

export function PreferencesSettingsSection() {
	const { locale, setLocale } = useLocaleStore();

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Preferences</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Manage account-level preferences for your workspace.</Trans>
				</p>
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
									<span>{languageFlags[code]}</span>
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
