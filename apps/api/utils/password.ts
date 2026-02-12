import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Minimum 8 characters, at least one letter and one number
 */
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
