import { AccountSettingsSection } from "@/features/settings/sections/AccountSettingsSection";
import { ChangePasswordSection } from "@/features/settings/sections/ChangePasswordSection";
import { PasskeysSection } from "@/features/settings/sections/PasskeysSection";

export function AccountSettingsView() {
	return (
		<div className="space-y-8 py-8">
			<div className="px-8">
				<AccountSettingsSection />
			</div>
			<div className="border-t border-border" />
			<div className="px-8">
				<ChangePasswordSection />
			</div>
			<div className="border-t border-border" />
			<div className="px-8">
				<PasskeysSection />
			</div>
		</div>
	);
}
