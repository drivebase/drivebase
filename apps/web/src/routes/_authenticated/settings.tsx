import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SettingsCategoryNav } from "@/features/settings/components/SettingsCategoryNav";

export const Route = createFileRoute("/_authenticated/settings")({
	beforeLoad: ({ location }) => {
		if (location.pathname === "/settings") {
			throw redirect({ to: "/settings/general", replace: true });
		}
	},
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<div className="p-8 h-full">
			<div className="flex gap-8 h-full">
				<SettingsCategoryNav />
				<div className="flex-1 overflow-y-auto pr-2">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
