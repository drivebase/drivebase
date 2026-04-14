import { z } from "zod";

export const loginSchema = z.object({
	email: z.string().min(1, "Email is required").email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters"),
		email: z.string().min(1, "Email is required").email("Invalid email address"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
