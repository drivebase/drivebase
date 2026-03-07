import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import {
	PiArrowRight as ArrowRight,
	PiCheckCircle as CheckCircle2,
	PiSpinnerGap as Loader2,
} from "react-icons/pi";
import { toast } from "sonner";
import { useMutation, useQuery } from "urql";
import { Button } from "@/components/ui/button";
import { PROVIDERS_QUERY } from "@/features/providers/api/provider";
import { graphql } from "@/gql";

const COMPLETE_ONBOARDING_MUTATION = graphql(`
	mutation CompleteOnboarding {
		completeOnboarding
	}
`);

interface CompletionStepProps {
	onComplete: () => void;
	oauth?: string;
	providerId?: string;
}

function formatProviderType(value: string): string {
	return value
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export function CompletionStep({
	onComplete,
	oauth,
	providerId,
}: CompletionStepProps) {
	const [{ fetching }, completeOnboarding] = useMutation(
		COMPLETE_ONBOARDING_MUTATION,
	);
	const shouldShowConnectedUi = oauth === "success" && Boolean(providerId);
	const [{ data: connectedData }] = useQuery({
		query: PROVIDERS_QUERY,
		pause: !shouldShowConnectedUi,
		requestPolicy: "network-only",
	});
	const [isCompleted, setIsCompleted] = useState(false);
	const connectedProvider = providerId
		? connectedData?.storageProviders.find(
				(provider) => provider.id === providerId,
			)
		: undefined;

	const handleComplete = async () => {
		try {
			const result = await completeOnboarding({});
			if (result.error) {
				toast.error(result.error.message);
				return;
			}
			setIsCompleted(true);
			// Small delay to show success state before redirecting
			setTimeout(() => {
				onComplete();
			}, 1000);
		} catch (_error) {
			toast.error(<Trans>Failed to complete onboarding</Trans>);
		}
	};

	return (
		<div className="flex flex-col flex-1 items-center justify-center text-center space-y-6 py-4">
			<div
				className={`w-16 h-16  flex items-center justify-center transition-all duration-500 ${
					isCompleted
						? "bg-emerald-100 text-emerald-600 scale-110 dark:bg-emerald-900/30 dark:text-emerald-400"
						: "bg-primary/10 text-primary"
				}`}
			>
				<CheckCircle2
					className={`w-8 h-8 transition-all duration-300 ${isCompleted ? "animate-in zoom-in" : ""}`}
				/>
			</div>

			<div className="space-y-1.5">
				<h2 className="text-2xl font-bold tracking-tight">
					{connectedProvider ? (
						<Trans>Provider Connected</Trans>
					) : (
						<Trans>You're all set!</Trans>
					)}
				</h2>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{connectedProvider ? (
						<Trans>
							Your storage account is now connected and your workspace is ready.
						</Trans>
					) : (
						<Trans>
							Your Drivebase workspace is ready. Start managing your files
							securely.
						</Trans>
					)}
				</p>
			</div>

			{connectedProvider && (
				<div className="w-full  border bg-muted/30 px-4 py-3 text-left">
					<p className="text-xs text-muted-foreground">
						<Trans>Provider</Trans>
					</p>
					<p className="text-sm font-medium">{connectedProvider.name}</p>
					<p className="text-xs text-muted-foreground mt-1">
						{formatProviderType(connectedProvider.type)}
					</p>
				</div>
			)}

			<div className="w-full space-y-3">
				<Button
					size="lg"
					className="w-full"
					onClick={handleComplete}
					disabled={fetching || isCompleted}
				>
					{fetching ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							<Trans>Finalizing...</Trans>
						</>
					) : isCompleted ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							<Trans>Redirecting...</Trans>
						</>
					) : (
						<>
							<Trans>Go to Dashboard</Trans>
							<ArrowRight className="w-4 h-4 ml-2" />
						</>
					)}
				</Button>

				<a
					href="https://discord.com/invite/5hPZwTPp68"
					rel="noopener noreferrer"
					target="_blank"
				>
					<Button className="w-full" variant={"outline"}>
						<Trans>Need help?</Trans>
					</Button>
				</a>
			</div>
		</div>
	);
}
