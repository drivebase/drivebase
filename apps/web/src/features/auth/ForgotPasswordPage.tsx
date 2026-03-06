import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PiSpinnerGap as Loader2 } from "react-icons/pi";
import { toast } from "sonner";
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
import {
	useRequestPasswordReset,
	useResetPassword,
} from "@/features/auth/hooks/useAuth";
import { AuthLayout } from "./AuthLayout";

const requestResetSchema = z.object({
	email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z
	.object({
		otp: z
			.string()
			.trim()
			.length(6, "OTP must be 6 digits")
			.regex(/^\d{6}$/, "OTP must be 6 digits"),
		newPassword: z.string().min(6, "Password must be at least 6 characters"),
		confirmPassword: z
			.string()
			.min(6, "Password must be at least 6 characters"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export function ForgotPasswordPage() {
	const navigate = useNavigate();
	const [{ fetching: requesting }, requestPasswordReset] =
		useRequestPasswordReset();
	const [{ fetching: resetting }, resetPassword] = useResetPassword();
	const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
	const [requestMessage, setRequestMessage] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	const requestForm = useForm<z.infer<typeof requestResetSchema>>({
		resolver: zodResolver(requestResetSchema),
		defaultValues: {
			email: "",
		},
	});

	const resetForm = useForm<z.infer<typeof resetPasswordSchema>>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			otp: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	async function handleRequestReset(
		values: z.infer<typeof requestResetSchema>,
	) {
		setFormError(null);
		const email = values.email.trim().toLowerCase();
		const result = await requestPasswordReset({ email });

		if (result.error) {
			setFormError(result.error.message);
			return;
		}

		setRequestedEmail(email);
		setRequestMessage(
			"If an account exists for that email, a verification code has been sent.",
		);
		resetForm.reset();
	}

	async function handleResetPassword(
		values: z.infer<typeof resetPasswordSchema>,
	) {
		if (!requestedEmail) {
			return;
		}

		setFormError(null);
		const result = await resetPassword({
			input: {
				email: requestedEmail,
				otp: values.otp.trim(),
				newPassword: values.newPassword,
			},
		});

		if (result.error) {
			setFormError(result.error.message);
			return;
		}

		toast.success("Password reset successfully");
		navigate({ to: "/login", replace: true });
	}

	function handleUseDifferentEmail() {
		setRequestedEmail(null);
		setRequestMessage(null);
		setFormError(null);
		resetForm.reset();
	}

	return (
		<AuthLayout
			title={<Trans>Reset Password</Trans>}
			description={
				<Trans>
					Enter your email and we&apos;ll help you reset your password
				</Trans>
			}
		>
			<div className="space-y-6">
				{formError && (
					<div className="border border-destructive/20 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-2">
						{formError}
					</div>
				)}

				{!requestedEmail ? (
					<Form {...requestForm}>
						<form
							onSubmit={requestForm.handleSubmit(handleRequestReset)}
							className="space-y-6"
						>
							<FormField
								control={requestForm.control}
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

							<Button
								type="submit"
								disabled={requesting}
								className="h-10 w-full"
							>
								{requesting && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								<Trans>Send Code</Trans>
							</Button>
						</form>
					</Form>
				) : (
					<div className="space-y-6">
						<div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
							<p>{requestMessage}</p>
							<p className="mt-1 font-medium text-foreground">
								{requestedEmail}
							</p>
						</div>

						<Form {...resetForm}>
							<form
								onSubmit={resetForm.handleSubmit(handleResetPassword)}
								className="space-y-4"
							>
								<FormField
									control={resetForm.control}
									name="otp"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												<Trans>Verification code</Trans>
											</FormLabel>
											<FormControl>
												<Input
													placeholder="123456"
													inputMode="numeric"
													autoComplete="one-time-code"
													maxLength={6}
													{...field}
													className="bg-background h-10"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={resetForm.control}
									name="newPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												<Trans>New password</Trans>
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

								<FormField
									control={resetForm.control}
									name="confirmPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												<Trans>Confirm new password</Trans>
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

								<div className="flex flex-col gap-3">
									<Button
										type="submit"
										disabled={resetting}
										className="h-10 w-full"
									>
										{resetting && (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										)}
										<Trans>Reset Password</Trans>
									</Button>

									<Button
										type="button"
										variant="outline"
										disabled={requesting}
										onClick={() => {
											if (!requestedEmail) {
												return;
											}

											void (async () => {
												setFormError(null);
												const result = await requestPasswordReset({
													email: requestedEmail,
												});

												if (result.error) {
													setFormError(result.error.message);
													return;
												}

												setRequestMessage(
													"If an account exists for that email, a new verification code has been sent.",
												);
											})();
										}}
										className="h-10 w-full"
									>
										{requesting && (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										)}
										<Trans>Resend Code</Trans>
									</Button>
								</div>
							</form>
						</Form>

						<Button
							type="button"
							variant="ghost"
							onClick={handleUseDifferentEmail}
							className="w-full"
						>
							<Trans>Use a different email</Trans>
						</Button>
					</div>
				)}

				<p className="text-center text-sm text-muted-foreground">
					<Trans>Remembered your password?</Trans>{" "}
					<Link
						to="/login"
						className="font-semibold text-primary hover:underline underline-offset-4 transition-colors"
					>
						<Trans>Back to sign in</Trans>
					</Link>
				</p>
			</div>
		</AuthLayout>
	);
}
