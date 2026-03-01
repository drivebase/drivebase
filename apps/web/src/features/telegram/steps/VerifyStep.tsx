import { Loader2, Shield } from "@/shared/components/icons/solar";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VerifyStepProps {
	loading: boolean;
	requires2FA: boolean;
	onVerifyCode: (code: string) => Promise<unknown>;
	onVerify2FA: (password: string) => Promise<unknown>;
}

export function VerifyStep({
	loading,
	requires2FA,
	onVerifyCode,
	onVerify2FA,
}: VerifyStepProps) {
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");

	const handleVerifyCode = async () => {
		const trimmed = code.trim();
		if (!trimmed) {
			toast.error("Please enter the verification code");
			return;
		}
		await onVerifyCode(trimmed);
	};

	const handleVerify2FA = async () => {
		const trimmed = password.trim();
		if (!trimmed) {
			toast.error("Please enter your 2FA password");
			return;
		}
		await onVerify2FA(trimmed);
	};

	if (requires2FA) {
		return (
			<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
				<div className="space-y-1.5">
					<div className="flex items-center gap-2">
						<Shield className="w-5 h-5 text-primary" />
						<h2 className="text-2xl font-bold tracking-tight">
							Two-Factor Auth
						</h2>
					</div>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Your account has two-factor authentication enabled. Enter your
						password to continue.
					</p>
				</div>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="password">2FA Password</Label>
						<Input
							id="password"
							type="password"
							placeholder="Enter your 2FA password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleVerify2FA()}
							disabled={loading}
							autoFocus
						/>
					</div>

					<Button
						className="w-full"
						onClick={handleVerify2FA}
						disabled={loading}
					>
						{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
						Verify Password
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
			<div className="space-y-1.5">
				<h2 className="text-2xl font-bold tracking-tight">Verify Code</h2>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Enter the verification code sent to your Telegram app.
				</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="code">Verification Code</Label>
					<Input
						id="code"
						type="text"
						inputMode="numeric"
						placeholder="12345"
						value={code}
						onChange={(e) => setCode(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
						disabled={loading}
						autoFocus
					/>
				</div>

				<Button
					className="w-full"
					onClick={handleVerifyCode}
					disabled={loading}
				>
					{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
					Verify
				</Button>
			</div>
		</div>
	);
}
