import { Fragment } from "react";
import {
	PiCheck as Check,
	PiKey as KeyRound,
	PiPhone as Phone,
} from "react-icons/pi";

const STEPS = [
	{ id: 1, label: "Phone", icon: Phone },
	{ id: 2, label: "Verify", icon: KeyRound },
	{ id: 3, label: "Done", icon: Check },
];

interface StepIndicatorProps {
	currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
	return (
		<div className="flex items-center justify-center mb-6">
			{STEPS.map((s, i) => (
				<Fragment key={s.id}>
					<div className="flex flex-col items-center gap-1.5">
						<div
							className={`w-8 h-8  flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
								currentStep > s.id
									? "bg-primary text-primary-foreground"
									: currentStep === s.id
										? "bg-primary text-primary-foreground ring-4 ring-primary/20"
										: "bg-muted text-muted-foreground"
							}`}
						>
							{currentStep > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
						</div>
						<span
							className={`text-[10px] font-medium uppercase tracking-wider transition-colors ${
								currentStep >= s.id ? "text-primary" : "text-muted-foreground"
							}`}
						>
							{s.label}
						</span>
					</div>
					{i < STEPS.length - 1 && (
						<div
							className={`w-20 h-px mx-3 mb-[22px] transition-colors duration-300 ${
								currentStep > s.id ? "bg-primary" : "bg-border"
							}`}
						/>
					)}
				</Fragment>
			))}
		</div>
	);
}
