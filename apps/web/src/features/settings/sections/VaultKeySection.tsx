import { Download, Key, Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyVault } from "@/features/vault/hooks/useVault";
import { useVaultCrypto } from "@/features/vault/hooks/useVaultCrypto";
import { useVaultStore } from "@/features/vault/store/vaultStore";
import { promptDialog } from "@/shared/lib/promptDialog";

export function VaultKeySection() {
	const [{ data }] = useMyVault();
	const { isUnlocked } = useVaultStore();
	const { getFingerprint, changePassphrase, generateBackup, downloadBackup } =
		useVaultCrypto();

	const [fingerprint, setFingerprint] = useState<string | null>(null);

	// Change passphrase dialog
	const [isChangeOpen, setIsChangeOpen] = useState(false);
	const [currentPassphrase, setCurrentPassphrase] = useState("");
	const [newPassphrase, setNewPassphrase] = useState("");
	const [confirmPassphrase, setConfirmPassphrase] = useState("");
	const [isChanging, setIsChanging] = useState(false);
	const [changeError, setChangeError] = useState("");

	useEffect(() => {
		getFingerprint()
			.then(setFingerprint)
			.catch(() => null);
	}, [getFingerprint]);

	const handleDownloadBackup = useCallback(async () => {
		const passphrase = await promptDialog(
			"Download Backup Key",
			"Enter your passphrase to generate and download your vault backup key. Store it somewhere safe — anyone with this file can restore access to your vault.",
			{
				placeholder: "Enter your vault passphrase",
				submitLabel: "Download",
				inputType: "password",
			},
		);

		if (!passphrase) return;

		try {
			const backup = await generateBackup(passphrase);
			downloadBackup(backup);
		} catch (_error) {
			toast.error("Incorrect passphrase. Please try again.");
		}
	}, [generateBackup, downloadBackup]);

	const handleChangePassphrase = useCallback(async () => {
		setChangeError("");

		if (newPassphrase.length < 8) {
			setChangeError("New passphrase must be at least 8 characters");
			return;
		}

		if (newPassphrase !== confirmPassphrase) {
			setChangeError("New passphrases do not match");
			return;
		}

		setIsChanging(true);
		try {
			await changePassphrase(currentPassphrase, newPassphrase);
			toast.success("Passphrase changed successfully");
			setIsChangeOpen(false);
			setCurrentPassphrase("");
			setNewPassphrase("");
			setConfirmPassphrase("");
		} catch (error) {
			setChangeError(
				error instanceof Error
					? error.message
					: "Failed to change passphrase. Check your current passphrase.",
			);
		} finally {
			setIsChanging(false);
		}
	}, [currentPassphrase, newPassphrase, confirmPassphrase, changePassphrase]);

	// Don't render if vault not set up
	if (!data?.myVault) {
		return null;
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Vault Key</h3>
				<p className="text-sm text-muted-foreground">
					Manage your end-to-end encryption key material for the Vault.
				</p>
			</div>

			<div className="space-y-4 max-w-md">
				{fingerprint && (
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground uppercase tracking-wider">
							Key Fingerprint
						</Label>
						<div className="flex items-center gap-2">
							<Key className="w-4 h-4 text-muted-foreground shrink-0" />
							<code className="text-xs font-mono bg-muted px-2 py-1 rounded">
								{fingerprint}
							</code>
						</div>
					</div>
				)}

				{!isUnlocked && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Lock className="w-4 h-4" />
						Unlock your vault to manage keys
					</div>
				)}

				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={handleDownloadBackup}
						disabled={!isUnlocked}
					>
						<Download className="w-4 h-4" />
						Download Backup Key
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsChangeOpen(true)}
						disabled={!isUnlocked}
					>
						Change Passphrase
					</Button>
				</div>
			</div>

			{/* Change Passphrase dialog */}
			<Dialog
				open={isChangeOpen}
				onOpenChange={(open) => {
					setIsChangeOpen(open);
					if (!open) {
						setCurrentPassphrase("");
						setNewPassphrase("");
						setConfirmPassphrase("");
						setChangeError("");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Vault Passphrase</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="current-passphrase">Current Passphrase</Label>
							<Input
								id="current-passphrase"
								type="password"
								value={currentPassphrase}
								onChange={(e) => setCurrentPassphrase(e.target.value)}
								autoFocus
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="new-passphrase">New Passphrase</Label>
							<Input
								id="new-passphrase"
								type="password"
								value={newPassphrase}
								onChange={(e) => setNewPassphrase(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirm-new-passphrase">
								Confirm New Passphrase
							</Label>
							<Input
								id="confirm-new-passphrase"
								type="password"
								value={confirmPassphrase}
								onChange={(e) => setConfirmPassphrase(e.target.value)}
							/>
						</div>

						{changeError && (
							<p className="text-sm text-destructive">{changeError}</p>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsChangeOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleChangePassphrase}
							disabled={
								isChanging ||
								!currentPassphrase ||
								!newPassphrase ||
								!confirmPassphrase
							}
						>
							{isChanging ? "Changing..." : "Change Passphrase"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
