import { createFileRoute } from "@tanstack/react-router";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";

export const Route = createFileRoute("/onboarding/")({
	validateSearch: (search: Record<string, unknown>) => {
		const oauth =
			search.oauth === "success" || search.oauth === "failed"
				? search.oauth
				: undefined;

		return {
			connected: search.connected === "true" ? true : undefined,
			oauth,
			step: search.step === "2" ? 2 : search.step === "3" ? 3 : undefined,
			providerId:
				typeof search.providerId === "string" ? search.providerId : undefined,
			error: typeof search.error === "string" ? search.error : undefined,
		};
	},
	component: OnboardingPage,
});

function OnboardingPage() {
	return <OnboardingWizard />;
}
