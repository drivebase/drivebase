import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SettingsCategoryNav } from "@/features/settings/components/SettingsCategoryNav";

export const Route = createFileRoute("/_authenticated/settings")({
	beforeLoad: ({ location }) => {
		if (location.pathname === "/settings") {
			throw redirect({ to: "/settings/account", replace: true });
		}
	},
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<div className="h-full">
			<div className="flex h-full">
				<SettingsCategoryNav />
				<div className="flex-1 overflow-y-auto">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
