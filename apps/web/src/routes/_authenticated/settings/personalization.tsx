import { createFileRoute } from "@tanstack/react-router";
import { PersonalizationSettingsView } from "@/features/settings/PersonalizationSettingsView";

export const Route = createFileRoute(
	"/_authenticated/settings/personalization",
)({
	component: PersonalizationSettingsPage,
});

function PersonalizationSettingsPage() {
	return <PersonalizationSettingsView />;
}
