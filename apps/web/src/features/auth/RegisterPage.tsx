import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
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
import { useRegister } from "@/features/auth/hooks/useAuth";
import { UserRole } from "@/gql/graphql";
import { AuthLayout } from "./AuthLayout";

const registerSchema = z.object({
	// Removed name as it is not in the RegisterInput type
	email: z.string().email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export function RegisterPage() {
	const [{ fetching }, register] = useRegister();
	const navigate = useNavigate();
	const [formError, setFormError] = useState<string | null>(null);

	const form = useForm<z.infer<typeof registerSchema>>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(values: z.infer<typeof registerSchema>) {
		setFormError(null);
		const result = await register({
			input: {
				...values,
				role: UserRole.Viewer, // Default role
			},
		});
		if (result.data?.register) {
			navigate({ to: "/" });
		} else if (result.error) {
			setFormError(result.error.message);
		}
	}

	return (
		<AuthLayout
			title={<Trans>Create Account</Trans>}
			description={<Trans>Enter your email below to create your account</Trans>}
		>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{formError && (
						<div className="p-3 text-sm font-medium text-destructive bg-destructive/10  border border-destructive/20 text-center animate-in fade-in slide-in-from-top-2">
							{formError}
						</div>
					)}

					<div className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										<Trans>Email</Trans>
									</FormLabel>
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
									<FormLabel>
										<Trans>Password</Trans>
									</FormLabel>
									<FormControl>
										<Input
											type="password"
											placeholder="••••••••"
											autoComplete="new-password"
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
						<Trans>Create Account</Trans>
					</Button>

					<p className="text-center text-sm text-muted-foreground pt-2">
						<Trans>Already have an account?</Trans>{" "}
						<Link
							to="/login"
							className="font-semibold text-primary hover:underline underline-offset-4 transition-colors"
						>
							<Trans>Sign in</Trans>
						</Link>
					</p>
				</form>
			</Form>
		</AuthLayout>
	);
}
