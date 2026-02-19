import { AccountSettingsSection } from "@/features/settings/sections/AccountSettingsSection";
import { ChangePasswordSection } from "@/features/settings/sections/ChangePasswordSection";

export function AccountSettingsView() {
	return (
		<div className="space-y-8">
			<AccountSettingsSection />
			<div className="border-t border-border" />
			<ChangePasswordSection />
		</div>
	);
}
