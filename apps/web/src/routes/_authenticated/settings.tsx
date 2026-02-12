import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PreferencesSettings } from "@/features/settings/PreferencesSettings";
import { useLogout } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const navigate = useNavigate();
	const [, logout] = useLogout();
	const clearAuth = useAuthStore((state) => state.logout);

	const handleSignOut = async () => {
		try {
			await logout();
		} catch (_error) {
			toast.error("Unable to sign out from server. Signing out locally.");
		} finally {
			clearAuth();
			navigate({ to: "/login", replace: true });
		}
	};

	return (
		<div className="p-8 max-w-2xl space-y-8">
			<PreferencesSettings />
			<div className="border-t border-border pt-6">
				<Button variant="outline" onClick={handleSignOut}>
					Sign out
				</Button>
			</div>
		</div>
	);
}
