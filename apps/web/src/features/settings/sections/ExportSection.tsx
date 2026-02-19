import { Trans } from "@lingui/react/macro";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExportSectionProps {
	onExport: (options: {
		includeProviders: boolean;
		includeSecrets: boolean;
		password?: string;
	}) => Promise<void>;
	isExporting: boolean;
}

export function ExportSection(props: ExportSectionProps) {
	const { onExport, isExporting } = props;

	const [includeProviders, setIncludeProviders] = useState(true);
	const [includeSecrets, setIncludeSecrets] = useState(false);
	const [password, setPassword] = useState("");

	const handleExport = async () => {
		await onExport({
			includeProviders,
			includeSecrets,
			password: includeSecrets && password ? password : undefined,
		});
	};

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Export workspace</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Export your workspace data including files, folders, and optionally provider configurations.</Trans>
				</p>
			</div>

			<div className="space-y-4 max-w-md">
				<div className="flex items-center space-x-2">
					<Checkbox
						id="includeProviders"
						checked={includeProviders}
						onCheckedChange={(checked) =>
							setIncludeProviders(checked === true)
						}
						disabled={isExporting}
					/>
					<Label
						htmlFor="includeProviders"
						className="text-sm font-normal cursor-pointer"
					>
						<Trans>Include provider configurations</Trans>
					</Label>
				</div>

				<div className="flex items-center space-x-2">
					<Checkbox
						id="includeSecrets"
						checked={includeSecrets}
						onCheckedChange={(checked) =>
							setIncludeSecrets(checked === true)
						}
						disabled={isExporting}
					/>
					<Label
						htmlFor="includeSecrets"
						className="text-sm font-normal cursor-pointer"
					>
						<Trans>Include sensitive credentials (requires password)</Trans>
					</Label>
				</div>

				{includeSecrets && (
					<div className="space-y-2 pl-6">
						<Label htmlFor="exportPassword">
							<Trans>Encryption password</Trans>
						</Label>
						<Input
							id="exportPassword"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Enter a strong password"
							disabled={isExporting}
						/>
						<p className="text-xs text-muted-foreground">
							<Trans>This password will be used to encrypt your export file. Keep it safe, as you'll need it to import the data.</Trans>
						</p>
					</div>
				)}

				<Button
					onClick={handleExport}
					disabled={isExporting || (includeSecrets && !password)}
				>
					{isExporting ? (
						<Trans>Exporting...</Trans>
					) : (
						<>
							<Download className="h-4 w-4 mr-2" />
							<Trans>Export workspace</Trans>
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
