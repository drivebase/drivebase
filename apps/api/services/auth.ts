import {
	AuthenticationError,
	NotFoundError,
	type UserRole,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { storeOTP, verifyOTP } from "../redis/otp";
import { checkRateLimit, RateLimits } from "../redis/rate-limit";
import { createSession, deleteUserSessions } from "../redis/session";
import { createToken } from "../utils/jwt";
import { logger } from "../utils/logger";
import { generateOTP, sendOTP } from "../utils/otp";
import {
	hashPassword,
	validatePassword,
	verifyPassword,
} from "../utils/password";

export class AuthService {
	constructor(private db: Database) {}

	/**
	 * Get current authenticated user
	 */
	async getCurrentUser(userId: string) {
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user) {
			throw new NotFoundError("User");
		}

		return user;
	}

	/**
	 * Register a new user (only owner can register)
	 */
	async register(
		email: string,
		password: string,
		role: UserRole,
		ipAddress: string,
	) {
		logger.info({ msg: "Register attempt", email, role, ipAddress });

		// Rate limit
		await checkRateLimit(`auth:register:${ipAddress}`, RateLimits.AUTH);
		logger.debug("Rate limit check passed");

		// Validate password
		const validation = validatePassword(password);
		if (!validation.valid) {
			logger.warn({
				msg: "Password validation failed",
				message: validation.message,
			});
			throw new ValidationError(validation.message || "Invalid password");
		}
		logger.debug("Password validation passed");

		// Check if email already exists
		const [existing] = await this.db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (existing) {
			logger.warn({ msg: "Email already exists", email });
			throw new ValidationError("Email already in use");
		}
		logger.debug("Email is available");

		// Hash password
		const passwordHash = await hashPassword(password);
		const defaultName = email.split("@")[0] || "User";
		logger.debug("Password hashed");

		// Create user
		logger.debug("Inserting user into database...");
		const [user] = await this.db
			.insert(users)
			.values({
				name: defaultName,
				email,
				passwordHash,
				role: role,
				isActive: true,
			})
			.returning();

		logger.debug({
			msg: "User created",
			user: user ? { id: user.id, email: user.email } : "NULL",
		});

		if (!user) {
			throw new Error("Failed to create user");
		}

		// Create JWT token
		logger.debug("Creating JWT token...");
		const token = await createToken({
			userId: user.id,
			email: user.email,
			role: user.role,
		});
		logger.debug("JWT token created");

		// Store session in Redis
		logger.debug("Storing session in Redis...");
		await createSession(token, {
			userId: user.id,
			email: user.email,
			role: user.role,
			createdAt: Date.now(),
		});
		logger.debug("Session stored");

		const result = {
			user,
			token,
		};

		logger.info({
			msg: "Register success",
			userId: result.user.id,
			email: result.user.email,
			hasToken: !!result.token,
		});

		return result;
	}

	/**
	 * Login user
	 */
	async login(email: string, password: string, ipAddress: string) {
		logger.info({ msg: "Login attempt", email, ipAddress });

		// Rate limit
		await checkRateLimit(`auth:login:${ipAddress}`, RateLimits.AUTH);
		logger.debug("Rate limit check passed");

		// Find user
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		logger.debug({
			msg: "User found",
			user: user
				? { id: user.id, email: user.email, role: user.role }
				: "not found",
		});

		if (!user) {
			logger.warn({ msg: "Login failed: User not found", email });
			throw new AuthenticationError("Invalid email or password");
		}

		if (!user.isActive) {
			logger.warn({ msg: "Login failed: User inactive", email });
			throw new AuthenticationError("Account is disabled");
		}

		// Verify password
		logger.debug("Verifying password...");
		const valid = await verifyPassword(password, user.passwordHash);
		logger.debug({ msg: "Password valid", valid });

		if (!valid) {
			logger.warn({ msg: "Login failed: Invalid password", email });
			throw new AuthenticationError("Invalid email or password");
		}

		// Update last login
		logger.debug("Updating last login...");
		await this.db
			.update(users)
			.set({ lastLoginAt: new Date() })
			.where(eq(users.id, user.id));

		// Create JWT token
		logger.debug("Creating JWT token...");
		const token = await createToken({
			userId: user.id,
			email: user.email,
			role: user.role,
		});
		logger.debug("JWT token created");

		// Store session in Redis
		logger.debug("Storing session in Redis...");
		await createSession(token, {
			userId: user.id,
			email: user.email,
			role: user.role,
			createdAt: Date.now(),
		});
		logger.debug("Session stored");

		const result = {
			user,
			token,
		};

		logger.info({
			msg: "Login success",
			userId: result.user.id,
			email: result.user.email,
			hasToken: !!result.token,
		});

		return result;
	}

	/**
	 * Logout user (delete all sessions)
	 */
	async logout(userId: string) {
		await deleteUserSessions(userId);
	}

	/**
	 * Change password
	 */
	async changePassword(
		userId: string,
		currentPassword: string,
		newPassword: string,
	) {
		// Validate new password
		const validation = validatePassword(newPassword);
		if (!validation.valid) {
			throw new ValidationError(validation.message || "Invalid password");
		}

		// Get user
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user) {
			throw new NotFoundError("User");
		}

		// Verify current password
		const valid = await verifyPassword(currentPassword, user.passwordHash);

		if (!valid) {
			throw new AuthenticationError("Current password is incorrect");
		}

		// Hash new password
		const passwordHash = await hashPassword(newPassword);

		// Update password
		await this.db
			.update(users)
			.set({ passwordHash, updatedAt: new Date() })
			.where(eq(users.id, userId));

		// Logout user from all sessions
		await deleteUserSessions(userId);
	}

	/**
	 * Request password reset OTP
	 */
	async requestPasswordReset(email: string, ipAddress: string) {
		// Rate limit
		await checkRateLimit(`auth:reset:${ipAddress}`, RateLimits.AUTH);

		// Check if user exists
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		// Always return success to prevent email enumeration
		if (!user) {
			return;
		}

		// Generate and store OTP
		const otp = generateOTP();
		await storeOTP(email, otp);

		// Send OTP
		await sendOTP(email, otp);
	}

	/**
	 * Reset password with OTP
	 */
	async resetPassword(email: string, otp: string, newPassword: string) {
		// Validate new password
		const validation = validatePassword(newPassword);
		if (!validation.valid) {
			throw new ValidationError(validation.message || "Invalid password");
		}

		// Verify OTP
		const valid = await verifyOTP(email, otp);

		if (!valid) {
			throw new AuthenticationError("Invalid or expired OTP");
		}

		// Get user
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (!user) {
			throw new NotFoundError("User");
		}

		// Hash new password
		const passwordHash = await hashPassword(newPassword);

		// Update password
		await this.db
			.update(users)
			.set({ passwordHash, updatedAt: new Date() })
			.where(eq(users.id, user.id));

		// Logout user from all sessions
		await deleteUserSessions(user.id);
	}

	/**
	 * Update current user's profile
	 */
	async updateMyProfile(userId: string, name: string) {
		const trimmedName = name.trim();
		if (!trimmedName) {
			throw new ValidationError("Name is required");
		}

		const [updated] = await this.db
			.update(users)
			.set({
				name: trimmedName,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId))
			.returning();

		if (!updated) {
			throw new NotFoundError("User");
		}

		return updated;
	}
}
