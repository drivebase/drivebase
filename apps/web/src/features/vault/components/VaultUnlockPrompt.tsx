import { Lock, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVaultCrypto } from "@/features/vault/hooks/useVaultCrypto";

interface VaultUnlockPromptProps {
	onUnlocked: () => void;
}

export function VaultUnlockPrompt({ onUnlocked }: VaultUnlockPromptProps) {
	const [passphrase, setPassphrase] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showRestore, setShowRestore] = useState(false);
	const backupInputRef = useRef<HTMLInputElement>(null);
	const [restorePassphrase, setRestorePassphrase] = useState("");

	const { unlockVault, restoreFromBackup } = useVaultCrypto();

	const handleUnlock = useCallback(async () => {
		if (!passphrase) return;

		setIsLoading(true);
		try {
			await unlockVault(passphrase);
			onUnlocked();
		} catch (error) {
			toast.error("Incorrect passphrase. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, [passphrase, unlockVault, onUnlocked]);

	const handleRestoreBackup = useCallback(
		async (file: File) => {
			if (!restorePassphrase) {
				toast.error("Please enter your passphrase first");
				return;
			}

			setIsLoading(true);
			try {
				await restoreFromBackup(file, restorePassphrase);
				onUnlocked();
			} catch (error) {
				toast.error(
					"Failed to restore from backup. Check your passphrase and backup file.",
				);
			} finally {
				setIsLoading(false);
			}
		},
		[restorePassphrase, restoreFromBackup, onUnlocked],
	);

	return (
		<div className="w-full max-w-sm">
			<Card className="shadow-xl border-border/50">
				<CardContent className="px-8 py-8 space-y-6">
					<div className="flex flex-col items-center gap-3">
						<div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
							<Lock className="w-7 h-7 text-primary" />
						</div>
						<div className="text-center space-y-1">
							<h2 className="text-xl font-bold">Vault Locked</h2>
							<p className="text-sm text-muted-foreground">
								Enter your passphrase to unlock the vault.
							</p>
						</div>
					</div>

					{!showRestore ? (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="unlock-passphrase">Passphrase</Label>
								<Input
									id="unlock-passphrase"
									type="password"
									value={passphrase}
									onChange={(e) => setPassphrase(e.target.value)}
									placeholder="Enter your vault passphrase"
									autoFocus
									onKeyDown={(e) => {
										if (e.key === "Enter") handleUnlock();
									}}
								/>
							</div>

							<Button
								size="lg"
								className="w-full"
								onClick={handleUnlock}
								disabled={isLoading || !passphrase}
							>
								{isLoading ? "Unlocking..." : "Unlock"}
							</Button>

							<div className="text-center">
								<button
									type="button"
									className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
									onClick={() => setShowRestore(true)}
								>
									Restore from backup key
								</button>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="restore-passphrase">Passphrase</Label>
								<Input
									id="restore-passphrase"
									type="password"
									value={restorePassphrase}
									onChange={(e) => setRestorePassphrase(e.target.value)}
									placeholder="Enter the passphrase used when backing up"
								/>
							</div>

							<input
								ref={backupInputRef}
								type="file"
								accept="application/json,.json"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleRestoreBackup(file);
								}}
							/>

							<Button
								size="lg"
								variant="outline"
								className="w-full gap-2"
								onClick={() => backupInputRef.current?.click()}
								disabled={isLoading || !restorePassphrase}
							>
								<Upload className="w-4 h-4" />
								Select Backup File
							</Button>

							<div className="text-center">
								<button
									type="button"
									className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
									onClick={() => setShowRestore(false)}
								>
									Back to passphrase unlock
								</button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
