import {
	Alert,
	Button,
	FieldError,
	Form,
	InputGroup,
	Label,
	TextField,
} from "@heroui/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { usePasswordReset } from "@/features/auth/hooks";

export const Route = createFileRoute("/auth/forgot-password")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const { step, email, error, requesting, resetting, requestOtp, submitReset } =
		usePasswordReset();

	function onRequestOtp(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(e.currentTarget));
		requestOtp(data.email as string);
	}

	function onReset(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(e.currentTarget));
		submitReset(data.otp as string, data.newPassword as string);
	}

	return (
		<div className="w-full max-w-xs space-y-6">
			{step === "email" ? (
				<>
					<div className="space-y-1">
						<h1 className="text-2xl font-bold text-foreground">Reset password</h1>
						<p className="text-sm text-muted">
							Enter your email and we'll send you a one-time code
						</p>
					</div>

					<Form key="email" onSubmit={onRequestOtp} className="space-y-4">
						{error && (
							<Alert status="danger">
								<Alert.Indicator />
								<Alert.Content>
									<Alert.Title>{error}</Alert.Title>
								</Alert.Content>
							</Alert>
						)}

						<TextField
							isRequired
							name="email"
							type="email"
							variant="secondary"
							className="w-full"
							validate={(v) =>
								/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v)
									? null
									: "Please enter a valid email address"
							}
						>
							<Label>Email</Label>
							<InputGroup>
								<InputGroup.Input placeholder="you@example.com" autoComplete="email" />
							</InputGroup>
							<FieldError />
						</TextField>

						<Button type="submit" className="w-full" isPending={requesting}>
							Send code
						</Button>
					</Form>
				</>
			) : (
				<>
					<div className="space-y-1">
						<h1 className="text-2xl font-bold text-foreground">Enter your code</h1>
						<p className="text-sm text-muted">
							We sent a code to <span className="text-foreground">{email}</span>
						</p>
					</div>

					<Form key="otp" onSubmit={onReset} className="space-y-4">
						{error && (
							<Alert status="danger">
								<Alert.Indicator />
								<Alert.Content>
									<Alert.Title>{error}</Alert.Title>
								</Alert.Content>
							</Alert>
						)}

						<TextField
							isRequired
							name="otp"
							type="text"
							variant="secondary"
							className="w-full"
							validate={(v) => (v.length < 1 ? "Code is required" : null)}
						>
							<Label>One-time code</Label>
							<InputGroup>
								<InputGroup.Input
									placeholder="Enter code"
									autoComplete="one-time-code"
									inputMode="numeric"
								/>
							</InputGroup>
							<FieldError />
						</TextField>

						<TextField
							isRequired
							name="newPassword"
							type="password"
							variant="secondary"
							className="w-full"
							validate={(v) =>
								v.length < 8 ? "Password must be at least 8 characters" : null
							}
						>
							<Label>New password</Label>
							<InputGroup>
								<InputGroup.Input placeholder="••••••••" autoComplete="new-password" />
							</InputGroup>
							<FieldError />
						</TextField>

						<Button type="submit" className="w-full" isPending={resetting}>
							Reset password
						</Button>
					</Form>
				</>
			)}

			<p className="text-center text-sm text-muted">
				<Link to="/auth/login" className="text-foreground font-medium hover:underline">
					Back to sign in
				</Link>
			</p>
		</div>
	);
}
