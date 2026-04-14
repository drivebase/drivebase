import {
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
import { useSignUp } from "@/features/auth/hooks";

export const Route = createFileRoute("/auth/signup")({
	component: SignupPage,
});

function SignupPage() {
	const { submit, fetching } = useSignUp();
	const [showPassword, setShowPassword] = useState(false);

	function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(e.currentTarget));
		submit(data.name as string, data.email as string, data.password as string);
	}

	return (
		<div className="w-full max-w-xs space-y-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-bold text-foreground">Create an account</h1>
				<p className="text-sm text-muted">Get started with Drivebase for free</p>
			</div>

			<Form onSubmit={onSubmit} className="space-y-4">
				<TextField
					isRequired
					name="name"
					type="text"
					variant="secondary"
					className="w-full"
					validate={(v) =>
						v.trim().length < 2 ? "Name must be at least 2 characters" : null
					}
				>
					<Label>Full name</Label>
					<InputGroup>
						<InputGroup.Input placeholder="John Doe" autoComplete="name" />
					</InputGroup>
					<FieldError />
				</TextField>

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
					validate={(v) =>
						v.length < 8 ? "Password must be at least 8 characters" : null
					}
				>
					<Label>Password</Label>
					<InputGroup>
						<InputGroup.Input placeholder="••••••••" autoComplete="new-password" />
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
					Create account
				</Button>
			</Form>

			<p className="text-center text-sm text-muted">
				Already have an account?{" "}
				<Link to="/auth/login" className="text-foreground font-medium hover:underline">
					Sign in
				</Link>
			</p>
		</div>
	);
}
