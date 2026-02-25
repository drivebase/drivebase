import {
	AuthenticationError,
	type UserRole,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { checkRateLimit, RateLimits } from "../../redis/rate-limit";
import { createSession } from "../../redis/session";
import { telemetry } from "../../telemetry";
import { createToken } from "../../utils/jwt";
import { logger } from "../../utils/logger";
import {
	hashPassword,
	validatePassword,
	verifyPassword,
} from "../../utils/password";
import { createDefaultWorkspace } from "../workspace";

/**
 * Register a new user (only owner can register)
 */
export async function register(
	db: Database,
	email: string,
	password: string,
	role: UserRole,
	ipAddress: string,
) {
	logger.info({ msg: "Register attempt", email, role, ipAddress });

	await checkRateLimit(`auth:register:${ipAddress}`, RateLimits.AUTH);
	logger.debug("Rate limit check passed");

	const validation = validatePassword(password);
	if (!validation.valid) {
		logger.warn({
			msg: "Password validation failed",
			message: validation.message,
		});
		throw new ValidationError(validation.message || "Invalid password");
	}
	logger.debug("Password validation passed");

	const [existing] = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (existing) {
		logger.warn({ msg: "Email already exists", email });
		throw new ValidationError("Email already in use");
	}
	logger.debug("Email is available");

	const passwordHash = await hashPassword(password);
	const defaultName = email.split("@")[0] || "User";
	logger.debug("Password hashed");

	logger.debug("Inserting user into database...");
	const user = await db.transaction(async (tx) => {
		const [createdUser] = await tx
			.insert(users)
			.values({
				name: defaultName,
				email,
				passwordHash,
				role: role,
				isActive: true,
			})
			.returning();

		if (!createdUser) {
			throw new Error("Failed to create user");
		}

		await createDefaultWorkspace(tx, createdUser.id);

		return createdUser;
	});

	logger.debug({
		msg: "User created",
		user: user ? { id: user.id, email: user.email } : "NULL",
	});

	logger.debug("Creating JWT token...");
	const token = await createToken({
		userId: user.id,
		email: user.email,
		role: user.role,
	});
	logger.debug("JWT token created");

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

	telemetry.capture("user_registered", { role });

	return result;
}

/**
 * Login user
 */
export async function login(
	db: Database,
	email: string,
	password: string,
	ipAddress: string,
) {
	logger.info({ msg: "Login attempt", email, ipAddress });

	await checkRateLimit(`auth:login:${ipAddress}`, RateLimits.AUTH);
	logger.debug("Rate limit check passed");

	const [user] = await db
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

	logger.debug("Verifying password...");
	const valid = await verifyPassword(password, user.passwordHash);
	logger.debug({ msg: "Password valid", valid });

	if (!valid) {
		logger.warn({ msg: "Login failed: Invalid password", email });
		throw new AuthenticationError("Invalid email or password");
	}

	logger.debug("Updating last login...");
	await db
		.update(users)
		.set({ lastLoginAt: new Date() })
		.where(eq(users.id, user.id));

	logger.debug("Creating JWT token...");
	const token = await createToken({
		userId: user.id,
		email: user.email,
		role: user.role,
	});
	logger.debug("JWT token created");

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

	telemetry.capture("user_login", { success: true });

	return result;
}
