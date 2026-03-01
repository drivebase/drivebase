import { useCallback, useRef, useState } from "react";
import { PiLock as Lock, PiUpload as Upload } from "react-icons/pi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVaultCrypto } from "@/features/vault/hooks/useVaultCrypto";
import { parseBackup } from "@/features/vault/lib/crypto";

interface VaultUnlockPromptProps {
	onUnlocked: () => void;
}

export function VaultUnlockPrompt({ onUnlocked }: VaultUnlockPromptProps) {
	const [passphrase, setPassphrase] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showRestore, setShowRestore] = useState(false);
	const backupInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [newPassphrase, setNewPassphrase] = useState("");
	const [confirmPassphrase, setConfirmPassphrase] = useState("");

	const { unlockVault, restoreFromBackup } = useVaultCrypto();

	const handleUnlock = useCallback(async () => {
		if (!passphrase) return;

		setIsLoading(true);
		try {
			await unlockVault(passphrase);
			onUnlocked();
		} catch (_error) {
			toast.error("Incorrect passphrase. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, [passphrase, unlockVault, onUnlocked]);

	const handleFileSelect = useCallback((file: File) => {
		// Validate the backup file immediately on selection
		file
			.text()
			.then((text) => {
				parseBackup(text);
				setSelectedFile(file);
			})
			.catch(() => {
				toast.error(
					"Invalid backup file. Make sure you're using a Drivebase vault backup.",
				);
			});
	}, []);

	const handleRestoreBackup = useCallback(async () => {
		if (!selectedFile || !newPassphrase) return;

		if (newPassphrase !== confirmPassphrase) {
			toast.error("Passphrases do not match");
			return;
		}

		setIsLoading(true);
		try {
			await restoreFromBackup(selectedFile, newPassphrase);
			onUnlocked();
		} catch (error) {
			toast.error(
				error instanceof Error && error.message
					? error.message
					: "Restore failed. The backup file may be corrupted.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [
		selectedFile,
		newPassphrase,
		confirmPassphrase,
		restoreFromBackup,
		onUnlocked,
	]);

	const handleBackToUnlock = useCallback(() => {
		setShowRestore(false);
		setSelectedFile(null);
		setNewPassphrase("");
		setConfirmPassphrase("");
	}, []);

	return (
		<div className="w-full max-w-sm">
			<Card className="shadow-xl border-border/50">
				<CardContent className="px-8 py-8 space-y-6">
					<div className="flex flex-col items-center gap-3">
						<div className="w-14 h-14  bg-primary/10 flex items-center justify-center">
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
							<input
								ref={backupInputRef}
								type="file"
								accept="application/json,.json"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleFileSelect(file);
									// Reset so same file can be re-selected if needed
									e.target.value = "";
								}}
							/>

							<Button
								size="lg"
								variant="outline"
								className="w-full gap-2"
								onClick={() => backupInputRef.current?.click()}
								disabled={isLoading}
							>
								<Upload className="w-4 h-4" />
								{selectedFile ? selectedFile.name : "Upload Backup File"}
							</Button>

							{selectedFile && (
								<>
									<div className="space-y-2">
										<Label htmlFor="new-passphrase">Set new passphrase</Label>
										<Input
											id="new-passphrase"
											type="password"
											value={newPassphrase}
											onChange={(e) => setNewPassphrase(e.target.value)}
											placeholder="Enter a new passphrase"
											autoFocus
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="confirm-passphrase">
											Confirm passphrase
										</Label>
										<Input
											id="confirm-passphrase"
											type="password"
											value={confirmPassphrase}
											onChange={(e) => setConfirmPassphrase(e.target.value)}
											placeholder="Repeat your new passphrase"
											onKeyDown={(e) => {
												if (e.key === "Enter") handleRestoreBackup();
											}}
										/>
									</div>

									<Button
										size="lg"
										className="w-full"
										onClick={handleRestoreBackup}
										disabled={isLoading || !newPassphrase || !confirmPassphrase}
									>
										{isLoading ? "Restoring..." : "Restore"}
									</Button>
								</>
							)}

							<div className="text-center">
								<button
									type="button"
									className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
									onClick={handleBackToUnlock}
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
