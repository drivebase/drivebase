import { AppearanceSettingsSection } from "@/features/settings/sections/AppearanceSettingsSection";
import { PreferencesSettingsSection } from "@/features/settings/sections/PreferencesSettingsSection";
import { ThemeSettingsSection } from "@/features/settings/sections/ThemeSettingsSection";

export function PersonalizationSettingsView() {
	return (
		<div className="space-y-8 py-8">
			<div className="px-8">
				<ThemeSettingsSection />
			</div>
			<div className="border-t border-border" />
			<div className="px-8">
				<PreferencesSettingsSection />
			</div>
			<div className="border-t border-border" />
			<div className="px-8">
				<AppearanceSettingsSection />
			</div>
		</div>
	);
}
