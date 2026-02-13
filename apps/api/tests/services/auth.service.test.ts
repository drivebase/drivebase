import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AuthService } from "../../services/auth";

// Mock dependencies
mock.module("@drivebase/db", () => ({
	users: {},
}));

mock.module("../../redis/otp", () => ({
	storeOTP: mock(),
	verifyOTP: mock(),
}));

mock.module("../../redis/rate-limit", () => ({
	checkRateLimit: mock(),
	RateLimits: { AUTH: "auth" },
}));

mock.module("../../redis/session", () => ({
	createSession: mock(),
	deleteUserSessions: mock(),
}));

mock.module("../../utils/jwt", () => ({
	createToken: mock(),
}));

mock.module("../../utils/otp", () => ({
	generateOTP: mock(),
	sendOTP: mock(),
}));

mock.module("../../utils/password", () => ({
	hashPassword: mock(),
	validatePassword: mock().mockReturnValue({ valid: true }),
	verifyPassword: mock(),
}));

mock.module("../../utils/logger", () => ({
	logger: {
		info: mock(),
		debug: mock(),
		warn: mock(),
		error: mock(),
	},
}));

describe("AuthService", () => {
	let authService: AuthService;
	const mockDb: any = {
		select: mock(() => mockDb),
		from: mock(() => mockDb),
		where: mock(() => mockDb),
		limit: mock(() => mockDb),
		insert: mock(() => mockDb),
		values: mock(() => mockDb),
		returning: mock(() => mockDb),
		update: mock(() => mockDb),
		set: mock(() => mockDb),
		delete: mock(() => mockDb),
	};

	beforeEach(() => {
		mock.restore();
		authService = new AuthService(mockDb);
	});

	it("should be defined", () => {
		expect(authService).toBeDefined();
	});
});
