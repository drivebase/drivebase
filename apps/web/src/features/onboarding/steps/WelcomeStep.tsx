import { ArrowRight, HardDrive, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
	onNext: () => void;
	userName: string;
}

const FEATURES = [
	{
		icon: HardDrive,
		color: "text-blue-500",
		bg: "bg-blue-500/10",
		title: "Unified Storage",
		description: "Connect Google Drive, S3, and local storage in one place.",
	},
	{
		icon: ShieldCheck,
		color: "text-emerald-500",
		bg: "bg-emerald-500/10",
		title: "Secure & Private",
		description: "Credentials are encrypted with AES-256-GCM.",
	},
	{
		icon: Zap,
		color: "text-amber-500",
		bg: "bg-amber-500/10",
		title: "Lightning Fast",
		description: "Optimized with built-in caching and CDN support.",
	},
];

export function WelcomeStep({ onNext, userName }: WelcomeStepProps) {
	return (
		<div className="space-y-6">
			<div className="space-y-1.5">
				<h1 className="text-2xl font-bold tracking-tight">
					Welcome, {userName}!
				</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Let's set up your workspace in a couple of steps.
				</p>
			</div>

			<div className="space-y-2.5">
				{FEATURES.map(({ icon: Icon, color, bg, title, description }) => (
					<div
						key={title}
						className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/30"
					>
						<div
							className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${bg}`}
						>
							<Icon className={`w-4 h-4 ${color}`} />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-medium leading-none mb-1">{title}</p>
							<p className="text-xs text-muted-foreground leading-relaxed">
								{description}
							</p>
						</div>
					</div>
				))}
			</div>

			<Button size="lg" className="w-full group" onClick={onNext}>
				Get Started
				<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
			</Button>
		</div>
	);
}
