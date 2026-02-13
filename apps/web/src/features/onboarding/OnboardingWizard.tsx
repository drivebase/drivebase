import { Check } from "lucide-react";
import { Fragment, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { CompletionStep } from "./steps/CompletionStep";
import { ProviderStep } from "./steps/ProviderStep";
import { WelcomeStep } from "./steps/WelcomeStep";

const STEPS = [
	{ id: 1, label: "Welcome" },
	{ id: 2, label: "Storage" },
	{ id: 3, label: "Complete" },
];

export function OnboardingWizard() {
	const [step, setStep] = useState(1);
	const { user } = useAuthStore();

	const handleNext = () => setStep((prev) => prev + 1);
	const handleComplete = () => {
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
				<CardContent className="px-8 py-8">
					{step === 1 && (
						<WelcomeStep
							onNext={handleNext}
							userName={user?.name ?? "there"}
						/>
					)}
					{step === 2 && <ProviderStep onNext={handleNext} />}
					{step === 3 && <CompletionStep onComplete={handleComplete} />}
				</CardContent>
			</Card>
		</div>
	);
}
