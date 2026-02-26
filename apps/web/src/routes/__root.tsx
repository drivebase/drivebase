import { Trans } from "@lingui/react/macro";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Toaster } from "sonner";
import { NotFound } from "@/components/not-found";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { useMe } from "@/features/auth/hooks/useAuth";
import { JobPanel } from "@/shared/components/JobPanel";
import { TransferProgressPanel } from "@/shared/components/TransferProgressPanel";
import { useActivityFeed } from "@/shared/hooks/useActivityFeed";
import { useJobsFeed } from "@/shared/hooks/useJobsFeed";
import { ConfirmDialogHost } from "@/shared/lib/confirmDialog";
import { PromptDialogHost } from "@/shared/lib/promptDialog";

export const Route = createRootRoute({
	component: RootComponent,
	errorComponent: RootErrorComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	useMe();
	useJobsFeed();
	useActivityFeed();

	const { theme } = useTheme();

	return (
		<>
			<Outlet />
			<ConfirmDialogHost />
			<PromptDialogHost />
			<JobPanel />
			<TransferProgressPanel />
			<Toaster position="bottom-right" theme={theme} />
		</>
	);
}

function RootErrorComponent({
	error,
	reset,
}: {
	error: unknown;
	reset: () => void;
}) {
	const message =
		error instanceof Error ? (
			error.message
		) : (
			<Trans>Something went wrong while loading the app.</Trans>
		);

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-8">
			<div className="max-w-md w-full  border bg-card p-6 text-center space-y-4">
				<img
					src="/drivebase.svg"
					alt="Drivebase"
					className="h-12 w-12 mx-auto"
				/>
				<div className="space-y-2">
					<h1 className="text-xl font-semibold">
						<Trans>Unable to load Drivebase</Trans>
					</h1>
					<p className="text-sm text-muted-foreground">{message}</p>
				</div>
				<div className="flex items-center justify-center gap-2 text-destructive text-sm">
					<AlertTriangle className="h-4 w-4" />
					<span>
						<Trans>Server may be unreachable</Trans>
					</span>
				</div>
				<Button className="w-full" onClick={reset}>
					<Trans>Try again</Trans>
				</Button>
			</div>
		</div>
	);
}
