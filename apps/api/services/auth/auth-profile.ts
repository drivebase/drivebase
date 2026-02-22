import { NotFoundError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { telemetry } from "../../posthog";

/**
 * Get current authenticated user
 */
export async function getCurrentUser(db: Database, userId: string) {
	const [user] = await db
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
 * Update current user's profile
 */
export async function updateMyProfile(
	db: Database,
	userId: string,
	name: string,
) {
	const trimmedName = name.trim();
	if (!trimmedName) {
		throw new ValidationError("Name is required");
	}

	const [updated] = await db
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

/**
 * Complete user onboarding
 */
export async function completeOnboarding(db: Database, userId: string) {
	const [updated] = await db
		.update(users)
		.set({
			onboardingCompleted: true,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId))
		.returning();

	if (!updated) {
		throw new NotFoundError("User");
	}

	telemetry.capture("onboarding_completed");

	return true;
}
