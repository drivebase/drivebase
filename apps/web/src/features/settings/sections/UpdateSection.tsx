import { Trans } from "@lingui/react/macro";
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpdate } from "../hooks/useUpdate";

export function UpdateSection() {
	const {
		currentVersion,
		latestGithubVersion,
		latestGithubTag,
		isUpdateAvailable,
		isChecking,
		phase,
		errorMessage,
		updaterStatus,
		triggerUpdate,
	} = useUpdate();

	const isInProgress = phase === "updating";
	const isSuccess = phase === "success";
	const isError = phase === "error";

	const statusLabel =
		updaterStatus === "pulling"
			? "Pulling new image..."
			: updaterStatus === "restarting"
				? "Restarting container..."
				: isInProgress
					? "Updating..."
					: null;

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Updates</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Manage application updates.</Trans>
				</p>
			</div>

			<div className="space-y-4 max-w-md">
				<div className="flex items-center justify-between">
					<span className="text-sm text-muted-foreground">
						<Trans>Current version</Trans>
					</span>
					<span className="text-sm font-mono">
						{isChecking ? "..." : (currentVersion ?? "unknown")}
					</span>
				</div>

				<div className="flex items-center justify-between">
					<span className="text-sm text-muted-foreground">
						<Trans>Latest version</Trans>
					</span>
					<div className="flex items-center gap-2">
						<span className="text-sm font-mono">
							{isChecking ? "..." : (latestGithubVersion ?? "unknown")}
						</span>
						{isUpdateAvailable && (
							<Badge variant="secondary">
								<Trans>Update available</Trans>
							</Badge>
						)}
					</div>
				</div>

				{isSuccess && (
					<div className="flex items-center gap-2 text-sm text-green-600">
						<CheckCircle className="h-4 w-4" />
						<Trans>Updated! The app will reload shortly.</Trans>
					</div>
				)}

				{isError && (
					<div className="flex items-center gap-2 text-sm text-destructive">
						<AlertCircle className="h-4 w-4" />
						<span>{errorMessage}</span>
					</div>
				)}

				{isInProgress && statusLabel && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>{statusLabel}</span>
					</div>
				)}

				<Button
					onClick={() => triggerUpdate(latestGithubTag ?? undefined)}
					disabled={!isUpdateAvailable || isInProgress || isSuccess}
				>
					{isInProgress ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							<Trans>Updating...</Trans>
						</>
					) : (
						<>
							<RefreshCw className="h-4 w-4 mr-2" />
							<Trans>Update now</Trans>
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
