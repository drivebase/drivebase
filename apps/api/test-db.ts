import { getDb, users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./utils/password";

async function testDb() {
	console.log("Testing database connection...");

	try {
		const db = getDb();

		// Try to query users table
		console.log("Querying users table...");
		const allUsers = await db.select().from(users);
		console.log(`Found ${allUsers.length} users`);

		if (allUsers.length > 0) {
			const firstUser = allUsers[0];
			if (firstUser) {
				console.log("First user:", {
					id: firstUser.id,
					email: firstUser.email,
					role: firstUser.role,
				});
			}
		}

		// Try to create a test user
		console.log("\nTrying to create test user...");
		const passwordHash = await hashPassword("test123456");

		const [newUser] = await db
			.insert(users)
			.values({
				name: "test",
				email: "test@test.com",
				passwordHash,
				role: "viewer",
				isActive: true,
			})
			.returning();

		console.log("Created user:", {
			id: newUser?.id,
			email: newUser?.email,
			role: newUser?.role,
		});

		// Clean up - delete test user
		if (newUser) {
			await db.delete(users).where(eq(users.id, newUser.id));
			console.log("Test user deleted");
		}

		console.log("\n✅ Database is working correctly!");
		process.exit(0);
	} catch (error) {
		console.error("❌ Database error:", error);
		process.exit(1);
	}
}

testDb();
