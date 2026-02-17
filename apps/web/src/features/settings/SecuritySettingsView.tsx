import { Trans } from "@lingui/macro";
import { Shield } from "lucide-react";

export function SecuritySettingsView() {
	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Security</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Manage security-related settings for your account.</Trans>
				</p>
			</div>
			<div className="rounded-md border border-border p-6 text-sm text-muted-foreground flex items-center gap-3">
				<Shield className="h-4 w-4" />
				<Trans>Security settings will appear here.</Trans>
			</div>
		</div>
	);
}
