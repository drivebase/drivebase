import { msg, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/authStore";
import { AccountSettingsSection } from "@/features/settings/sections/AccountSettingsSection";
import { PreferencesSettingsSection } from "@/features/settings/sections/PreferencesSettingsSection";

export function GeneralSettingsView() {
	const { i18n } = useLingui();
	const navigate = useNavigate();
	const [, logout] = useLogout();
	const clearAuth = useAuthStore((state) => state.logout);

	const handleSignOut = async () => {
		try {
			await logout();
		} catch (_error) {
			toast.error(
				i18n._(msg`Unable to sign out from server. Signing out locally.`),
			);
		} finally {
			clearAuth();
			navigate({ to: "/login", replace: true });
		}
	};

	return (
		<div className="space-y-8">
			<AccountSettingsSection />
			<div className="border-t border-border" />
			<PreferencesSettingsSection />
			<div className="border-t border-border pt-6">
				<Button variant="outline" onClick={handleSignOut}>
					<Trans>Sign out</Trans>
				</Button>
			</div>
		</div>
	);
}
