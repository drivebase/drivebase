import { getDb, users } from "@drivebase/db";
import { sql } from "drizzle-orm";
import { getAvailableProviders } from "../config/providers";
import { getRedis } from "../redis/client";
import { AuthService } from "../services/auth";
import { logger } from "./logger";

/**
 * Initialize the application on first startup
 * Creates default owner user if no users exist
 */
export async function initializeApp() {
	logger.info("Initializing application...");

	// Initialize Redis
	getRedis();

	const db = getDb();

	// Test database connection
	try {
		await db.execute(sql`SELECT 1`);
		logger.debug("PostgreSQL connected");
	} catch (error) {
		logger.error({ msg: "PostgreSQL connection failed", error });
		throw error;
	}

	// Log available providers
	const providers = getAvailableProviders();
	logger.info({
		msg: "Available providers loaded",
		count: providers.length,
		providers: providers.map((p) => p.id),
	});

	// Check if any users exist
	let existingUsers: unknown[] = [];
	try {
		existingUsers = await db.select().from(users).limit(1);
	} catch (error) {
		logger.error({
			msg: "Database error. Make sure to run migrations first",
			hint: "cd packages/db && bun run migrate",
			error,
		});
		throw error;
	}

	if (existingUsers.length === 0) {
		logger.info("No users found. Creating default owner user...");

		// Get default credentials from environment or use defaults
		const defaultEmail =
			process.env.DEFAULT_OWNER_EMAIL || "admin@drivebase.local";
		const defaultPassword = process.env.DEFAULT_OWNER_PASSWORD || "admin123";

		const authService = new AuthService(db);

		try {
			const owner = await authService.register(
				defaultEmail,
				defaultPassword,
				"system",
			);

			logger.info({
				msg: "Default owner user created",
				email: owner.user.email,
				password: defaultPassword,
				warning: "Please change the password after first login!",
			});
		} catch (error) {
			logger.error({ msg: "Failed to create default owner user", error });
			throw error;
		}
	}
}
