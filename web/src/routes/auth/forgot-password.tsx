import { createFileRoute, Link } from "@tanstack/react-router";
import { HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePasswordReset } from "@/features/auth/hooks";

export const Route = createFileRoute("/auth/forgot-password")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const { step, email, error, requesting, resetting, requestOtp, submitReset } =
		usePasswordReset();

	function onRequestOtp(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(e.currentTarget));
		requestOtp(data.email as string);
	}

	function onReset(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(e.currentTarget));
		submitReset(data.otp as string, data.newPassword as string);
	}

	return (
		<div className="w-full max-w-sm">
			{/* Logo */}
			<div className="mb-8 flex flex-col items-center gap-3">
				<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
					<HardDrive size={32} className="text-white" />
				</div>
				<div className="text-center">
					<h1 className="text-xl font-semibold text-white">Drivebase</h1>
					<p className="text-sm text-white/50">
						{step === "email" ? "Reset your password" : "Check your email"}
					</p>
				</div>
			</div>

			{/* Card */}
			<div className="rounded-2xl bg-white/8 p-8 ring-1 ring-white/10 backdrop-blur-2xl">
				{error && (
					<div className="mb-5 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
						{error}
					</div>
				)}

				{step === "email" ? (
					<form key="email" onSubmit={onRequestOtp} className="space-y-5">
						<p className="text-sm text-white/40">
							Enter your email and we'll send you a one-time code.
						</p>
						<div className="space-y-1.5">
							<Label className="text-white/70 text-xs font-medium">Email</Label>
							<Input
								name="email"
								type="email"
								required
								autoComplete="email"
								placeholder="you@example.com"
								className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-white/20 focus-visible:border-white/25"
							/>
						</div>
						<Button
							type="submit"
							disabled={requesting}
							className="w-full bg-white text-slate-900 hover:bg-white/90 font-medium"
						>
							{requesting ? "Sending…" : "Send code"}
						</Button>
					</form>
				) : (
					<form key="otp" onSubmit={onReset} className="space-y-5">
						<p className="text-sm text-white/40">
							We sent a code to{" "}
							<span className="text-white/70">{email}</span>
						</p>
						<div className="space-y-1.5">
							<Label className="text-white/70 text-xs font-medium">One-time code</Label>
							<Input
								name="otp"
								type="text"
								required
								autoComplete="one-time-code"
								inputMode="numeric"
								placeholder="Enter code"
								className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-white/20 focus-visible:border-white/25"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-white/70 text-xs font-medium">New password</Label>
							<Input
								name="newPassword"
								type="password"
								required
								minLength={8}
								autoComplete="new-password"
								placeholder="••••••••"
								className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-white/20 focus-visible:border-white/25"
							/>
						</div>
						<Button
							type="submit"
							disabled={resetting}
							className="w-full bg-white text-slate-900 hover:bg-white/90 font-medium"
						>
							{resetting ? "Resetting…" : "Reset password"}
						</Button>
					</form>
				)}
			</div>

			<p className="mt-6 text-center text-sm text-white/30">
				<Link to="/auth/login" className="text-white/60 hover:text-white transition-colors">
					← Back to sign in
				</Link>
			</p>
		</div>
	);
}
