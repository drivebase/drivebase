import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Route } from "@/routes/onboarding/index";
import { useAuthStore } from "@/store/authStore";
import { CompletionStep } from "./steps/CompletionStep";
import { ProviderStep } from "./steps/ProviderStep";
import { WelcomeStep } from "./steps/WelcomeStep";

const STEPS = [
	{ id: 1, label: "Welcome" },
	{ id: 2, label: "Storage" },
	{ id: 3, label: "Complete" },
];

const STORAGE_KEY = "onboarding_step";

export function OnboardingWizard() {
	const { connected } = Route.useSearch();
	const navigate = useNavigate();
	const { user } = useAuthStore();

	const [step, setStep] = useState<number>(() => {
		// If returning from OAuth, jump straight to the completion step.
		if (connected) return 3;
		// Restore persisted step in case of accidental navigation.
		const saved = localStorage.getItem(STORAGE_KEY);
		return saved ? Number(saved) : 1;
	});

	// Clean up persisted step and strip the ?connected param once we're on step 3.
	useEffect(() => {
		if (step >= 3) {
			localStorage.removeItem(STORAGE_KEY);
			if (connected) {
				navigate({ to: "/onboarding", search: { connected: undefined }, replace: true });
			}
		}
	}, [step, connected, navigate]);

	const handleNext = () =>
		setStep((prev) => {
			const next = prev + 1;
			if (next < 3) localStorage.setItem(STORAGE_KEY, String(next));
			return next;
		});

	const handleComplete = () => {
		localStorage.removeItem(STORAGE_KEY);
		window.location.href = "/";
	};

	return (
		<div className="w-full max-w-md">
			{/* Logo */}
			<div className="flex items-center justify-center gap-2.5 mb-10">
				<img src="/drivebase.svg" alt="Drivebase" className="h-7 w-7" />
				<span className="font-semibold text-lg tracking-tight">Drivebase</span>
			</div>

			{/* Step Indicator */}
			<div className="flex items-center justify-center mb-6">
				{STEPS.map((s, i) => (
					<Fragment key={s.id}>
						<div className="flex flex-col items-center gap-1.5">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
									step > s.id
										? "bg-primary text-primary-foreground"
										: step === s.id
											? "bg-primary text-primary-foreground ring-4 ring-primary/20"
											: "bg-muted text-muted-foreground"
								}`}
							>
								{step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
							</div>
							<span
								className={`text-[10px] font-medium uppercase tracking-wider transition-colors ${
									step >= s.id ? "text-primary" : "text-muted-foreground"
								}`}
							>
								{s.label}
							</span>
						</div>
						{i < STEPS.length - 1 && (
							<div
								className={`w-20 h-px mx-3 mb-[22px] transition-colors duration-300 ${
									step > s.id ? "bg-primary" : "bg-border"
								}`}
							/>
						)}
					</Fragment>
				))}
			</div>

			{/* Card */}
			<Card className="shadow-xl border-border/50">
				<CardContent className="px-8 py-8 min-h-[440px] flex flex-col">
					{step === 1 && (
						<WelcomeStep onNext={handleNext} userName={user?.name ?? "there"} />
					)}
					{step === 2 && <ProviderStep onNext={handleNext} />}
					{step === 3 && <CompletionStep onComplete={handleComplete} />}
				</CardContent>
			</Card>
		</div>
	);
}
