import { UserRole } from "@drivebase/core";
import { getDb, users } from "@drivebase/db";
import { sql } from "drizzle-orm";
import { getAvailableProviders } from "../../config/providers";
import { getRedis } from "../../redis/client";
import { UserService } from "../../service/user";
import { logger } from "./logger";

export async function initializeApp() {
	logger.info("Initializing application...");

	getRedis();

	const db = getDb();

	try {
		await db.execute(sql`SELECT 1`);
		logger.debug("PostgreSQL connected");
	} catch (error) {
		logger.error({ msg: "PostgreSQL connection failed", error });
		throw error;
	}

	const providers = getAvailableProviders();
	logger.info({
		msg: "Available providers loaded",
		count: providers.length,
		providers: providers.map((p) => p.id),
	});

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
