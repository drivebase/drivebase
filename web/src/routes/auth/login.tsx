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
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useSignIn } from "@/features/auth/hooks";

export const Route = createFileRoute("/auth/login")({
	component: LoginPage,
});

function LoginPage() {
	const { submit, fetching, error } = useSignIn();
	const [showPassword, setShowPassword] = useState(false);

	function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(e.currentTarget));
		submit(data.email as string, data.password as string);
	}

	return (
		<div className="w-full max-w-xs space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
				<p className="text-sm text-muted">Sign in to your account to continue</p>
			</div>

			<Form onSubmit={onSubmit} className="space-y-4">
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

				<TextField
					isRequired
					name="password"
					type={showPassword ? "text" : "password"}
					variant="secondary"
					className="w-full"
					validate={(v) => (v.length < 1 ? "Password is required" : null)}
				>
					<Label>Password</Label>
					<InputGroup>
						<InputGroup.Input placeholder="••••••••" autoComplete="current-password" />
						<InputGroup.Suffix>
							<button
								type="button"
								className="text-muted hover:text-foreground transition-colors"
								onClick={() => setShowPassword((v) => !v)}
							>
								{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</InputGroup.Suffix>
					</InputGroup>
					<FieldError />
				</TextField>

				<Button type="submit" className="w-full" isPending={fetching}>
					Sign in
				</Button>
			</Form>

			<p className="text-center text-sm text-muted">
				Don't have an account?{" "}
				<Link to="/auth/signup" className="text-foreground font-medium hover:underline">
					Sign up
				</Link>
			</p>
		</div>
	);
}
