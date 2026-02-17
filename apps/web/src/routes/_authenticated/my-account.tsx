import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import { AccountSettingsSection } from "@/features/settings/AccountSettingsSection";

export const Route = createFileRoute("/_authenticated/my-account")({
	component: MyAccountPage,
});

function MyAccountPage() {
	return (
		<div className="p-8 max-w-2xl space-y-8">
			<AccountSettingsSection />
			<Separator />
		</div>
	);
}
