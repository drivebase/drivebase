import { createFileRoute } from "@tanstack/react-router";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";

export const Route = createFileRoute("/onboarding/")({
	component: OnboardingPage,
});

function OnboardingPage() {
	return <OnboardingWizard />;
}
