import { createFileRoute } from "@tanstack/react-router";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";

export const Route = createFileRoute("/onboarding/")({
	validateSearch: (search: Record<string, unknown>) => ({
		connected: search.connected === "true" ? true : undefined,
	}),
	component: OnboardingPage,
});

function OnboardingPage() {
	return <OnboardingWizard />;
}
