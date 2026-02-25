import type { UserRole } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { login, register } from "./auth/auth-credentials";
import {
	changePassword,
	logout,
	requestPasswordReset,
	resetPassword,
} from "./auth/auth-password";
import {
	completeOnboarding,
	getCurrentUser,
	updateMyProfile,
} from "./auth/auth-profile";

export class AuthService {
	constructor(private db: Database) {}

	async getCurrentUser(userId: string) {
		return getCurrentUser(this.db, userId);
	}

	async register(
		email: string,
		password: string,
		role: UserRole,
		ipAddress: string,
	) {
		return register(this.db, email, password, role, ipAddress);
	}

	async login(email: string, password: string, ipAddress: string) {
		return login(this.db, email, password, ipAddress);
	}

	async logout(userId: string) {
		return logout(userId);
	}

	async changePassword(
		userId: string,
		currentPassword: string,
		newPassword: string,
	) {
		return changePassword(this.db, userId, currentPassword, newPassword);
	}

	async requestPasswordReset(email: string, ipAddress: string) {
		return requestPasswordReset(this.db, email, ipAddress);
	}

	async resetPassword(email: string, otp: string, newPassword: string) {
		return resetPassword(this.db, email, otp, newPassword);
	}

	async updateMyProfile(userId: string, name: string) {
		return updateMyProfile(this.db, userId, name);
	}

	async completeOnboarding(userId: string) {
		return completeOnboarding(this.db, userId);
	}
}
