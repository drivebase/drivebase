import { UserRole } from "@drivebase/core";
import { getDb, users } from "@drivebase/db";
import { UserService } from "../services/user";
import { logger } from "./logger";

/**
 * Initialize the application on first startup
 * Creates default owner user if no users exist
 */
export async function initializeApp() {
	logger.info("Initializing application...");
	const db = getDb();

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

		const userService = new UserService(db);

		try {
			const owner = await userService.create({
				email: defaultEmail,
				password: defaultPassword,
				role: UserRole.OWNER,
			});

			logger.info({
				msg: "Default owner user created",
				email: owner.email,
				password: defaultPassword,
				warning: "Please change the password after first login!",
			});
		} catch (error) {
			logger.error({ msg: "Failed to create default owner user", error });
			throw error;
		}
	}
}
