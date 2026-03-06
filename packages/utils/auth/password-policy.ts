export function validatePassword(password: string): {
	valid: boolean;
	message?: string;
} {
	if (password.length < 8) {
		return {
			valid: false,
			message: "Password must be at least 8 characters long",
		};
	}

	if (!/[a-zA-Z]/.test(password)) {
		return {
			valid: false,
			message: "Password must contain at least one letter",
		};
	}

	if (!/[0-9]/.test(password)) {
		return {
			valid: false,
			message: "Password must contain at least one number",
		};
	}

	return { valid: true };
}
