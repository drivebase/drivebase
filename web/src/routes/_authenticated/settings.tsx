import { useSignOut } from "@/features/auth/hooks";
import { Button } from "@heroui/react";
import { createFileRoute } from "@tanstack/react-router";
import { LogOut, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { submit: signOut, fetching } = useSignOut();

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center gap-2">
				<Settings size={20} className="text-muted" />
				<h1 className="text-xl font-semibold text-foreground">Settings</h1>
			</div>

			<div className="max-w-sm">
				<Button variant="danger" onPress={() => signOut()} isPending={fetching}>
					<LogOut size={15} />
					Sign out
				</Button>
			</div>
		</div>
	);
}
