import { Check, Download, Lock, ShieldCheck } from "lucide-react";
import { Fragment, useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVaultCrypto } from "@/features/vault/hooks/useVaultCrypto";
import type { VaultBackup } from "@/features/vault/lib/crypto";

const STEPS = [
	{ id: 1, label: "Welcome" },
	{ id: 2, label: "Passphrase" },
	{ id: 3, label: "Backup" },
];

interface VaultSetupWizardProps {
	onComplete: () => void;
}

export function VaultSetupWizard({ onComplete }: VaultSetupWizardProps) {
	const [step, setStep] = useState(1);
	const [passphrase, setPassphrase] = useState("");
	const [confirm, setConfirm] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [backup, setBackup] = useState<VaultBackup | null>(null);
	const [backupDownloaded, setBackupDownloaded] = useState(false);
	const [passphraseError, setPassphraseError] = useState("");

	const { setupVault, downloadBackup } = useVaultCrypto();

	const handleCreatePassphrase = useCallback(async () => {
		setPassphraseError("");

		if (passphrase.length < 8) {
			setPassphraseError("Passphrase must be at least 8 characters");
			return;
		}

		if (passphrase !== confirm) {
			setPassphraseError("Passphrases do not match");
			return;
		}

		setIsLoading(true);
		try {
			const vaultBackup = await setupVault(passphrase);
			setBackup(vaultBackup);
			setStep(3);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Setup failed";
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	}, [passphrase, confirm, setupVault]);

	const handleDownloadBackup = useCallback(() => {
		if (!backup) return;
		downloadBackup(backup);
		setBackupDownloaded(true);
	}, [backup, downloadBackup]);

	const handleComplete = useCallback(() => {
		if (!backupDownloaded) {
			toast.error("Please download your backup key first");
			return;
		}
		onComplete();
	}, [backupDownloaded, onComplete]);

	const passphraseStrength = useCallback((p: string) => {
		if (p.length === 0) return null;
		if (p.length < 8) return { label: "Too short", color: "bg-red-500", width: "w-1/4" };
		if (p.length < 12) return { label: "Weak", color: "bg-orange-500", width: "w-2/4" };
		if (p.length < 16) return { label: "Good", color: "bg-yellow-500", width: "w-3/4" };
		return { label: "Strong", color: "bg-green-500", width: "w-full" };
	}, []);

	const strength = passphraseStrength(passphrase);

	return (
		<div className="w-full max-w-md">
			{/* Step indicator */}
			<div className="flex items-center justify-center mb-6">
				{STEPS.map((s, i) => (
					<Fragment key={s.id}>
						<div className="flex flex-col items-center gap-1.5">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
									step > s.id
										? "bg-primary text-primary-foreground"
										: step === s.id
											? "bg-primary text-primary-foreground ring-4 ring-primary/20"
											: "bg-muted text-muted-foreground"
								}`}
							>
								{step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
							</div>
							<span
								className={`text-[10px] font-medium uppercase tracking-wider transition-colors ${
									step >= s.id ? "text-primary" : "text-muted-foreground"
								}`}
							>
								{s.label}
							</span>
						</div>
						{i < STEPS.length - 1 && (
							<div
								className={`w-20 h-px mx-3 mb-[22px] transition-colors duration-300 ${
									step > s.id ? "bg-primary" : "bg-border"
								}`}
							/>
						)}
					</Fragment>
				))}
			</div>

			<Card className="shadow-xl border-border/50">
				<CardContent className="px-8 py-8 min-h-[420px] flex flex-col">
					{step === 1 && <WelcomeStep onNext={() => setStep(2)} />}
					{step === 2 && (
						<PassphraseStep
							passphrase={passphrase}
							confirm={confirm}
							strength={strength}
							error={passphraseError}
							isLoading={isLoading}
							onPassphraseChange={setPassphrase}
							onConfirmChange={setConfirm}
							onSubmit={handleCreatePassphrase}
						/>
					)}
					{step === 3 && (
						<BackupStep
							backupDownloaded={backupDownloaded}
							onDownload={handleDownloadBackup}
							onComplete={handleComplete}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// ── Step Components ───────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
	return (
		<div className="space-y-6 flex-1 flex flex-col">
			<div className="space-y-1.5">
				<h1 className="text-2xl font-bold tracking-tight">Secure Vault</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Your vault uses end-to-end encryption. Only you can access your files
					— not even Drivebase can read them.
				</p>
			</div>

			<div className="space-y-2.5 flex-1">
				{[
					{
						icon: ShieldCheck,
						color: "text-emerald-500",
						bg: "bg-emerald-500/10",
						title: "End-to-end encrypted",
						desc: "Files are encrypted on your device before upload. The server never sees plaintext.",
					},
					{
						icon: Lock,
						color: "text-blue-500",
						bg: "bg-blue-500/10",
						title: "Passphrase protected",
						desc: "Your private key is protected by a passphrase only you know.",
					},
					{
						icon: Download,
						color: "text-amber-500",
						bg: "bg-amber-500/10",
						title: "Backup your key",
						desc: "Save your backup key. If you forget your passphrase, your files cannot be recovered.",
					},
				].map(({ icon: Icon, color, bg, title, desc }) => (
					<div
						key={title}
						className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/30"
					>
						<div
							className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${bg}`}
						>
							<Icon className={`w-4 h-4 ${color}`} />
						</div>
						<div className="min-w-0">
							<p className="text-sm font-medium leading-none mb-1">{title}</p>
							<p className="text-xs text-muted-foreground leading-relaxed">
								{desc}
							</p>
						</div>
					</div>
				))}
			</div>

			<Button size="lg" className="w-full" onClick={onNext}>
				Set Up Vault
			</Button>
		</div>
	);
}

interface PassphraseStepProps {
	passphrase: string;
	confirm: string;
	strength: { label: string; color: string; width: string } | null;
	error: string;
	isLoading: boolean;
	onPassphraseChange: (v: string) => void;
	onConfirmChange: (v: string) => void;
	onSubmit: () => void;
}

function PassphraseStep({
	passphrase,
	confirm,
	strength,
	error,
	isLoading,
	onPassphraseChange,
	onConfirmChange,
	onSubmit,
}: PassphraseStepProps) {
	return (
		<div className="space-y-6 flex-1 flex flex-col">
			<div className="space-y-1.5">
				<h1 className="text-2xl font-bold tracking-tight">Create Passphrase</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Choose a strong passphrase. You will need it every time you unlock
					your vault. It cannot be recovered if lost.
				</p>
			</div>

			<div className="space-y-4 flex-1">
				<div className="space-y-2">
					<Label htmlFor="passphrase">Passphrase</Label>
					<Input
						id="passphrase"
						type="password"
						value={passphrase}
						onChange={(e) => onPassphraseChange(e.target.value)}
						placeholder="Enter a strong passphrase"
						autoComplete="new-password"
					/>
					{strength && (
						<div className="space-y-1">
							<div className="h-1.5 bg-muted rounded-full overflow-hidden">
								<div
									className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`}
								/>
							</div>
							<p className="text-xs text-muted-foreground">{strength.label}</p>
						</div>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="confirm">Confirm Passphrase</Label>
					<Input
						id="confirm"
						type="password"
						value={confirm}
						onChange={(e) => onConfirmChange(e.target.value)}
						placeholder="Repeat your passphrase"
						autoComplete="new-password"
						onKeyDown={(e) => {
							if (e.key === "Enter") onSubmit();
						}}
					/>
				</div>

				{error && (
					<p className="text-sm text-destructive">{error}</p>
				)}
			</div>

			<Button
				size="lg"
				className="w-full"
				onClick={onSubmit}
				disabled={isLoading || !passphrase || !confirm}
			>
				{isLoading ? "Setting up..." : "Create Vault"}
			</Button>
		</div>
	);
}

interface BackupStepProps {
	backupDownloaded: boolean;
	onDownload: () => void;
	onComplete: () => void;
}

function BackupStep({ backupDownloaded, onDownload, onComplete }: BackupStepProps) {
	return (
		<div className="space-y-6 flex-1 flex flex-col">
			<div className="space-y-1.5">
				<h1 className="text-2xl font-bold tracking-tight">Save Backup Key</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Download your backup key and store it safely. Without it, you cannot
					recover your vault if you forget your passphrase.
				</p>
			</div>

			<div className="flex-1 flex flex-col gap-4">
				<div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
					<p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
						Warning: If you lose your passphrase and backup key, your encrypted
						files are permanently unrecoverable.
					</p>
				</div>

				<Button
					size="lg"
					variant="outline"
					className="w-full gap-2"
					onClick={onDownload}
				>
					<Download className="w-4 h-4" />
					{backupDownloaded ? "Download Again" : "Download Backup Key"}
				</Button>

				{backupDownloaded && (
					<div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
						<Check className="w-4 h-4" />
						Backup key downloaded
					</div>
				)}
			</div>

			<Button
				size="lg"
				className="w-full"
				onClick={onComplete}
				disabled={!backupDownloaded}
			>
				Complete Setup
			</Button>
		</div>
	);
}
