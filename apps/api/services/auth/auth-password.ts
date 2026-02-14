import {
	AuthenticationError,
	NotFoundError,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { storeOTP, verifyOTP } from "../../redis/otp";
import { checkRateLimit, RateLimits } from "../../redis/rate-limit";
import { deleteUserSessions } from "../../redis/session";
import { generateOTP, sendOTP } from "../../utils/otp";
import {
	hashPassword,
	validatePassword,
	verifyPassword,
} from "../../utils/password";

/**
 * Logout user (delete all sessions)
 */
export async function logout(userId: string) {
	await deleteUserSessions(userId);
}

/**
 * Change password
 */
export async function changePassword(
	db: Database,
	userId: string,
	currentPassword: string,
	newPassword: string,
) {
	const validation = validatePassword(newPassword);
	if (!validation.valid) {
		throw new ValidationError(validation.message || "Invalid password");
	}

	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!user) {
		throw new NotFoundError("User");
	}

	const valid = await verifyPassword(currentPassword, user.passwordHash);

	if (!valid) {
		throw new AuthenticationError("Current password is incorrect");
	}

	const passwordHash = await hashPassword(newPassword);

	await db
		.update(users)
		.set({ passwordHash, updatedAt: new Date() })
		.where(eq(users.id, userId));

	await deleteUserSessions(userId);
}

/**
 * Request password reset OTP
 */
export async function requestPasswordReset(
	db: Database,
	email: string,
	ipAddress: string,
) {
	await checkRateLimit(`auth:reset:${ipAddress}`, RateLimits.AUTH);

	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (!user) {
		return;
	}

	const otp = generateOTP();
	await storeOTP(email, otp);

	await sendOTP(email, otp);
}

/**
 * Reset password with OTP
 */
export async function resetPassword(
	db: Database,
	email: string,
	otp: string,
	newPassword: string,
) {
	const validation = validatePassword(newPassword);
	if (!validation.valid) {
		throw new ValidationError(validation.message || "Invalid password");
	}

	const valid = await verifyOTP(email, otp);

	if (!valid) {
		throw new AuthenticationError("Invalid or expired OTP");
	}

	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (!user) {
		throw new NotFoundError("User");
	}

	const passwordHash = await hashPassword(newPassword);

	await db
		.update(users)
		.set({ passwordHash, updatedAt: new Date() })
		.where(eq(users.id, user.id));

	await deleteUserSessions(user.id);
}
