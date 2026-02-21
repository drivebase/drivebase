import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/features/auth/hooks/useAuth";
import { AuthLayout } from "./AuthLayout";

const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export function LoginPage() {
	const [{ fetching }, login] = useLogin();
	const navigate = useNavigate();
	const [formError, setFormError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof loginSchema>>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(values: z.infer<typeof loginSchema>) {
		setFormError(null);
		const result = await login({ input: values });
		if (result.data?.login) {
			navigate({ to: "/" });
		} else if (result.error) {
			setFormError(result.error.message.replace(/^\[GraphQL\]\s*/, ""));
		}
	}

	return (
		<AuthLayout
			title="Welcome Back"
			description="Enter your email to sign in to your account"
		>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{formError && (
						<div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-md border border-destructive/20 text-center animate-in fade-in slide-in-from-top-2">
							{formError}
						</div>
					)}

					<div className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											placeholder="name@example.com"
											autoComplete="email"
											{...field}
											className="bg-background h-10"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>Password</FormLabel>
										<Link
											to="/login"
											className="text-xs font-medium text-primary hover:underline underline-offset-4"
											tabIndex={-1}
										>
											Forgot password?
										</Link>
									</div>
									<FormControl>
										<Input
											type="password"
											placeholder="••••••••"
											autoComplete="current-password"
											{...field}
											className="bg-background h-10"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<Button
						type="submit"
						disabled={fetching}
						className="w-full h-10 font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-shadow"
					>
						{fetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Sign In
					</Button>

					<p className="text-center text-sm text-muted-foreground pt-2">
						Don&apos;t have an account?{" "}
						<Link
							to="/register"
							className="font-semibold text-primary hover:underline underline-offset-4 transition-colors"
						>
							Sign up
						</Link>
					</p>
				</form>
			</Form>
		</AuthLayout>
	);
}
