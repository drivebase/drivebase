import { Trans } from "@lingui/react/macro";
import {
	PiArrowRight as ArrowRight,
	PiHardDrives as HardDrive,
	PiShieldCheck as ShieldCheck,
	PiLightning as Zap,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
	onNext: () => void;
	userName: string;
}

const FEATURES = [
	{
		id: "unified-storage",
		icon: HardDrive,
		color: "text-blue-500",
		bg: "bg-blue-500/10",
	},
	{
		id: "secure-private",
		icon: ShieldCheck,
		color: "text-emerald-500",
		bg: "bg-emerald-500/10",
	},
	{
		id: "lightning-fast",
		icon: Zap,
		color: "text-amber-500",
		bg: "bg-amber-500/10",
	},
];

export function WelcomeStep({ onNext, userName }: WelcomeStepProps) {
	return (
		<div className="space-y-6">
			<div className="space-y-1.5">
				<h1 className="text-2xl font-bold tracking-tight">
					<Trans>Welcome, {userName}!</Trans>
				</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					<Trans>Let's set up your workspace in a couple of steps.</Trans>
				</p>
			</div>

			<div className="space-y-2.5">
				{FEATURES.map(({ id, icon: Icon, color, bg }) => (
					<div
						key={id}
						className="flex items-start gap-3 p-3  border border-border/60 bg-muted/30"
					>
						<div
							className={`w-8 h-8  flex items-center justify-center flex-shrink-0 ${bg}`}
						>
							<Icon className={`w-4 h-4 ${color}`} />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-medium leading-none mb-1">
								{id === "unified-storage" && <Trans>Unified Storage</Trans>}
								{id === "secure-private" && <Trans>Secure & Private</Trans>}
								{id === "lightning-fast" && <Trans>Lightning Fast</Trans>}
							</p>
							<p className="text-xs text-muted-foreground leading-relaxed">
								{id === "unified-storage" && (
									<Trans>
										Connect Google Drive, S3, and local storage in one place.
									</Trans>
								)}
								{id === "secure-private" && (
									<Trans>Credentials are encrypted with AES-256-GCM.</Trans>
								)}
								{id === "lightning-fast" && (
									<Trans>
										Optimized with built-in caching and CDN support.
									</Trans>
								)}
							</p>
						</div>
					</div>
				))}
			</div>

			<Button size="lg" className="w-full group" onClick={onNext}>
				<Trans>Get Started</Trans>
				<ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
			</Button>
		</div>
	);
}
