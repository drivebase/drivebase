import { useMutation } from "urql";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { graphql } from "@/gql";
import { toast } from "sonner";
import { useState } from "react";

const COMPLETE_ONBOARDING_MUTATION = graphql(`
	mutation CompleteOnboarding {
		completeOnboarding
	}
`);

interface CompletionStepProps {
	onComplete: () => void;
}

export function CompletionStep({ onComplete }: CompletionStepProps) {
	const [{ fetching }, completeOnboarding] = useMutation(
		COMPLETE_ONBOARDING_MUTATION,
	);
	const [isCompleted, setIsCompleted] = useState(false);

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
		} catch (error) {
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
				<h2 className="text-2xl font-bold tracking-tight">You're all set!</h2>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Your Drivebase workspace is ready. Start managing your files securely.
				</p>
			</div>

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
