import { AuthenticationError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { checkRateLimit, RateLimits } from "../../redis/rate-limit";
import { createSession } from "../../redis/session";
import { createToken } from "../../utils/jwt";
import { logger } from "../../utils/logger";
import {
	hashPassword,
	validatePassword,
	verifyPassword,
} from "../../utils/password";
import { WorkspaceService } from "../workspace";

/**
 * Register a new user
 */
export async function register(
	db: Database,
	email: string,
	password: string,
	ipAddress: string,
) {
	logger.info({ msg: "Register attempt", email, ipAddress });

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
	const [user] = await db
		.insert(users)
		.values({
			name: defaultName,
			email,
			passwordHash,
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

	// Create default workspace for the new user
	logger.debug("Creating default workspace...");
	const workspaceService = new WorkspaceService(db);
	const workspace = await workspaceService.createWorkspace(
		`${defaultName}'s Workspace`,
		user.id,
	);
	logger.debug({ msg: "Workspace created", workspaceId: workspace.id });

	logger.debug("Creating JWT token...");
	const token = await createToken({
		userId: user.id,
		email: user.email,
		workspaceId: workspace.id,
		workspaceRole: "owner",
	});
	logger.debug("JWT token created");

	logger.debug("Storing session in Redis...");
	await createSession(token, {
		userId: user.id,
		email: user.email,
		workspaceId: workspace.id,
		workspaceRole: "owner",
		createdAt: Date.now(),
	});
	logger.debug("Session stored");

	const result = {
		user,
		token,
		workspaceId: workspace.id,
		workspaceRole: "owner" as const,
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
		user: user ? { id: user.id, email: user.email } : "not found",
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

	// Get user's default workspace
	const workspaceService = new WorkspaceService(db);
	const defaultWs = await workspaceService.getDefaultWorkspace(user.id);

	if (!defaultWs) {
		// Create a workspace if none exists (migration edge case)
		logger.debug("No workspace found, creating default workspace...");
		const workspace = await workspaceService.createWorkspace(
			`${user.name}'s Workspace`,
			user.id,
		);
		const workspaceId = workspace.id;
		const workspaceRole = "owner";

		const token = await createToken({
			userId: user.id,
			email: user.email,
			workspaceId,
			workspaceRole,
		});

		await createSession(token, {
			userId: user.id,
			email: user.email,
			workspaceId,
			workspaceRole,
			createdAt: Date.now(),
		});

		return { user, token, workspaceId, workspaceRole };
	}

	const { workspace, role: workspaceRole } = defaultWs;

	logger.debug("Creating JWT token...");
	const token = await createToken({
		userId: user.id,
		email: user.email,
		workspaceId: workspace.id,
		workspaceRole,
	});
	logger.debug("JWT token created");

	logger.debug("Storing session in Redis...");
	await createSession(token, {
		userId: user.id,
		email: user.email,
		workspaceId: workspace.id,
		workspaceRole,
		createdAt: Date.now(),
	});
	logger.debug("Session stored");

	const result = {
		user,
		token,
		workspaceId: workspace.id,
		workspaceRole,
	};

	logger.info({
		msg: "Login success",
		userId: result.user.id,
		email: result.user.email,
		hasToken: !!result.token,
	});

	return result;
}
