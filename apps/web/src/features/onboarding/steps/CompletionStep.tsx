import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
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
		? connectedData?.storageProviders.find((provider) => provider.id === providerId)
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
			toast.error("Failed to complete onboarding");
		}
	};

	return (
		<div className="flex flex-col flex-1 items-center justify-center text-center space-y-6 py-4">
			<div
				className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
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
					{connectedProvider ? "Provider Connected" : "You're all set!"}
				</h2>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{connectedProvider
						? "Your storage account is now connected and your workspace is ready."
						: "Your Drivebase workspace is ready. Start managing your files securely."}
				</p>
			</div>

			{connectedProvider && (
				<div className="w-full rounded-lg border bg-muted/30 px-4 py-3 text-left">
					<p className="text-xs text-muted-foreground">Provider</p>
					<p className="text-sm font-medium">{connectedProvider.name}</p>
					<p className="text-xs text-muted-foreground mt-1">
						{formatProviderType(connectedProvider.type)}
					</p>
				</div>
			)}

			<Button
				size="lg"
				className="w-full"
				onClick={handleComplete}
				disabled={fetching || isCompleted}
			>
				{fetching ? (
					<>
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						Finalizing...
					</>
				) : isCompleted ? (
					<>
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						Redirecting...
					</>
				) : (
					<>
						Go to Dashboard
						<ArrowRight className="w-4 h-4 ml-2" />
					</>
				)}
			</Button>
		</div>
	);
}
