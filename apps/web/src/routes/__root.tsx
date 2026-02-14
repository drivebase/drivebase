import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useAuth";
import { ConfirmDialogHost } from "@/lib/confirmDialog";
import { PromptDialogHost } from "@/lib/promptDialog";

export const Route = createRootRoute({
	component: RootComponent,
	errorComponent: RootErrorComponent,
});

function RootComponent() {
	// This will fetch the user profile if a token exists in localStorage
	useMe();

	const { theme } = useTheme();

	return (
		<>
			<Outlet />
			<ConfirmDialogHost />
			<PromptDialogHost />
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
		error instanceof Error
			? error.message
			: "Something went wrong while loading the app.";

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-8">
			<div className="max-w-md w-full rounded-2xl border bg-card p-6 text-center space-y-4">
				<img
					src="/drivebase.svg"
					alt="Drivebase"
					className="h-12 w-12 mx-auto"
				/>
				<div className="space-y-2">
					<h1 className="text-xl font-semibold">Unable to load Drivebase</h1>
					<p className="text-sm text-muted-foreground">{message}</p>
				</div>
				<div className="flex items-center justify-center gap-2 text-destructive text-sm">
					<AlertTriangle className="h-4 w-4" />
					<span>Server may be unreachable</span>
				</div>
				<Button className="w-full" onClick={reset}>
					Try again
				</Button>
			</div>
		</div>
	);
}
