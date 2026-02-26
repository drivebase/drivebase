import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Check, Copy } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DownloadLinkConfigResult = {
	maxDownloads: number;
	expiresInDays: number;
};

type DownloadLinkConfigOptions = {
	defaultMaxDownloads?: number;
	defaultExpiresInDays?: number;
	maxExpiresInDays?: number;
	onCreate: (value: DownloadLinkConfigResult) => Promise<string>;
};

type DownloadLinkConfigState = {
	open: boolean;
	title: string;
	description: string;
	defaultMaxDownloads: number;
	defaultExpiresInDays: number;
	maxExpiresInDays: number;
	onCreate: ((value: DownloadLinkConfigResult) => Promise<string>) | null;
	resolve: (() => void) | null;
};

const initialState: DownloadLinkConfigState = {
	open: false,
	title: "",
	description: "",
	defaultMaxDownloads: 10,
	defaultExpiresInDays: 7,
	maxExpiresInDays: 30,
	onCreate: null,
	resolve: null,
};

let openDownloadLinkConfigDialog:
	| ((
			options: Omit<DownloadLinkConfigState, "open" | "resolve">,
			resolve: () => void,
	  ) => void)
	| null = null;

export function downloadLinkConfigDialog(
	title: string,
	description: string,
	options: DownloadLinkConfigOptions,
): Promise<void> {
	return new Promise((resolve) => {
		if (!openDownloadLinkConfigDialog) {
			resolve();
			return;
		}

		openDownloadLinkConfigDialog(
			{
				title,
				description,
				defaultMaxDownloads: options.defaultMaxDownloads ?? 10,
				defaultExpiresInDays: options.defaultExpiresInDays ?? 7,
				maxExpiresInDays: options.maxExpiresInDays ?? 30,
				onCreate: options.onCreate,
			},
			resolve,
		);
	});
}

export function DownloadLinkConfigDialogHost() {
	const [state, setState] = useState<DownloadLinkConfigState>(initialState);
	const [maxDownloadsInput, setMaxDownloadsInput] = useState("10");
	const [expiresInDaysInput, setExpiresInDaysInput] = useState("7");
	const [errorMessage, setErrorMessage] = useState<ReactNode | null>(null);
	const [generatedLink, setGeneratedLink] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCopySuccess, setIsCopySuccess] = useState(false);

	useEffect(() => {
		openDownloadLinkConfigDialog = (options, resolve) => {
			setState({ ...options, open: true, resolve });
			setMaxDownloadsInput(String(options.defaultMaxDownloads));
			setExpiresInDaysInput(String(options.defaultExpiresInDays));
			setErrorMessage(null);
			setGeneratedLink(null);
			setIsSubmitting(false);
			setIsCopySuccess(false);
		};

		return () => {
			openDownloadLinkConfigDialog = null;
		};
	}, []);

	const close = () => {
		const resolver = state.resolve;
		setState(initialState);
		setMaxDownloadsInput(String(initialState.defaultMaxDownloads));
		setExpiresInDaysInput(String(initialState.defaultExpiresInDays));
		setErrorMessage(null);
		setGeneratedLink(null);
		setIsSubmitting(false);
		setIsCopySuccess(false);
		resolver?.();
	};

	useEffect(() => {
		if (!isCopySuccess) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setIsCopySuccess(false);
		}, 1500);

		return () => window.clearTimeout(timeoutId);
	}, [isCopySuccess]);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage(null);

		const maxDownloads = Number(maxDownloadsInput);
		if (!Number.isInteger(maxDownloads) || maxDownloads < 0) {
			setErrorMessage(
				<Trans>Max downloads must be 0 or a positive integer.</Trans>,
			);
			return;
		}

		const expiresInDays = Number(expiresInDaysInput);
		if (
			!Number.isInteger(expiresInDays) ||
			expiresInDays < 1 ||
			expiresInDays > state.maxExpiresInDays
		) {
			setErrorMessage(
				<Trans>
					Expiry must be a whole number between 1 and {state.maxExpiresInDays}{" "}
					days.
				</Trans>,
			);
			return;
		}

		if (!state.onCreate) {
			setErrorMessage(<Trans>Failed to create download link.</Trans>);
			return;
		}

		setIsSubmitting(true);
		try {
			const link = await state.onCreate({ maxDownloads, expiresInDays });
			if (!link) {
				setErrorMessage(<Trans>Failed to create download link.</Trans>);
				return;
			}
			setGeneratedLink(link);
			setIsCopySuccess(false);
		} catch (error) {
			setErrorMessage(
				error instanceof Error && error.message ? (
					error.message
				) : (
					<Trans>Failed to create download link.</Trans>
				),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const copyGeneratedLink = async () => {
		if (!generatedLink) {
			return;
		}
		try {
			await navigator.clipboard.writeText(generatedLink);
			setIsCopySuccess(true);
			toast.success(<Trans>Download link copied</Trans>);
		} catch {
			setIsCopySuccess(false);
			toast.error(<Trans>Failed to copy download link</Trans>);
		}
	};

	return (
		<Dialog open={state.open} onOpenChange={(open) => !open && close()}>
			<DialogContent showCloseButton={false}>
				<form onSubmit={submit}>
					<DialogHeader>
						<DialogTitle>{state.title}</DialogTitle>
						{state.description ? (
							<DialogDescription>{state.description}</DialogDescription>
						) : null}
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="download-link-max-downloads">
								<Trans>Max downloads</Trans>
							</Label>
							<Input
								id="download-link-max-downloads"
								type="number"
								min={0}
								step={1}
								placeholder={t`0 for unlimited`}
								value={maxDownloadsInput}
								onChange={(event) => setMaxDownloadsInput(event.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="download-link-expiry-days">
								<Trans>Expires in days</Trans>
							</Label>
							<Input
								id="download-link-expiry-days"
								type="number"
								min={1}
								max={state.maxExpiresInDays}
								step={1}
								placeholder={t`0 for unlimited`}
								value={expiresInDaysInput}
								onChange={(event) => setExpiresInDaysInput(event.target.value)}
							/>
						</div>

						{generatedLink ? (
							<div className="space-y-2">
								<Label htmlFor="generated-download-link">
									<Trans>Download link</Trans>
								</Label>
								<div className="flex items-center gap-2">
									<Input
										id="generated-download-link"
										value={generatedLink}
										readOnly
									/>
									<Button
										type="button"
										variant="outline"
										size="icon-sm"
										onClick={copyGeneratedLink}
										title={isCopySuccess ? t`Copied` : t`Copy download link`}
									>
										{isCopySuccess ? (
											<Check className="h-4 w-4 text-emerald-600" />
										) : (
											<Copy className="h-4 w-4" />
										)}
										<span className="sr-only">
											{isCopySuccess ? (
												<Trans>Copied</Trans>
											) : (
												<Trans>Copy download link</Trans>
											)}
										</span>
									</Button>
								</div>
							</div>
						) : null}

						{errorMessage ? (
							<p className="text-sm text-destructive">{errorMessage}</p>
						) : null}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={close}>
							{generatedLink ? <Trans>Done</Trans> : <Trans>Cancel</Trans>}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{generatedLink ? (
								<Trans>Generate new link</Trans>
							) : (
								<Trans>Create download link</Trans>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
