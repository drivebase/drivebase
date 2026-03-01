import type { ReactNode } from "react";
import { PiSpinnerGap as Loader2 } from "react-icons/pi";

interface InfoPanelProps {
	loading?: boolean;
	loadingMessage?: string;
	error?: boolean;
	errorMessage?: string;
	children: ReactNode;
}

export function InfoPanel({
	loading,
	loadingMessage = "Loading details...",
	error,
	errorMessage = "Failed to load details.",
	children,
}: InfoPanelProps) {
	if (loading) {
		return (
			<div className="h-full flex items-center justify-center text-muted-foreground">
				<Loader2 className="h-5 w-5 animate-spin mr-2" />
				{loadingMessage}
			</div>
		);
	}

	if (error) {
		return <div className="text-sm text-destructive">{errorMessage}</div>;
	}

	return <div className="space-y-5">{children}</div>;
}
