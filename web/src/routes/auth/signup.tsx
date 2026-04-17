import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, HardDrive } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignUp } from "@/features/auth/hooks";

export const Route = createFileRoute("/auth/signup")({
	component: SignupPage,
});

function SignupPage() {
	const { submit, fetching, error } = useSignUp();
	const [showPassword, setShowPassword] = useState(false);

	function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(e.currentTarget));
		submit(data.name as string, data.email as string, data.password as string);
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
					<p className="text-sm text-white/50">Create your account</p>
				</div>
			</div>

			{/* Card */}
			<div className="rounded-2xl bg-white/8 p-8 ring-1 ring-white/10 backdrop-blur-2xl">
				{error && (
					<div className="mb-5 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
						{error}
					</div>
				)}

				<form onSubmit={onSubmit} className="space-y-5">
					<div className="space-y-1.5">
						<Label className="text-white/70 text-xs font-medium">Full name</Label>
						<Input
							name="name"
							type="text"
							required
							autoComplete="name"
							placeholder="John Doe"
							className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-white/20 focus-visible:border-white/25"
						/>
					</div>

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

					<div className="space-y-1.5">
						<Label className="text-white/70 text-xs font-medium">Password</Label>
						<div className="relative">
							<Input
								name="password"
								type={showPassword ? "text" : "password"}
								required
								minLength={8}
								autoComplete="new-password"
								placeholder="••••••••"
								className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-white/20 focus-visible:border-white/25 pr-10"
							/>
							<button
								type="button"
								tabIndex={-1}
								onClick={() => setShowPassword((v) => !v)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
							>
								{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
							</button>
						</div>
					</div>

					<Button
						type="submit"
						disabled={fetching}
						className="w-full bg-white text-slate-900 hover:bg-white/90 font-medium"
					>
						{fetching ? "Creating account…" : "Create account"}
					</Button>
				</form>
			</div>

			<p className="mt-6 text-center text-sm text-white/30">
				Already have an account?{" "}
				<Link to="/auth/login" className="text-white/60 hover:text-white transition-colors">
					Sign in
				</Link>
			</p>
		</div>
	);
}
