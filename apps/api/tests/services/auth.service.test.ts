import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

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

mock.module("../../utils/auth/jwt", () => ({
	createToken: mock(),
}));

mock.module("../../utils/auth/otp", () => ({
	generateOTP: mock(),
	sendOTP: mock(),
}));

mock.module("../../utils/auth/password", () => ({
	hashPassword: mock(),
	verifyPassword: mock(),
}));

mock.module("../../utils/runtime/logger", () => ({
	logger: {
		info: mock(),
		debug: mock(),
		warn: mock(),
		error: mock(),
	},
}));

type AuthServiceType = typeof import("../../service/auth")["AuthService"];
let AuthServiceCtor: AuthServiceType;

describe("AuthService", () => {
	let authService: InstanceType<AuthServiceType>;
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

	beforeAll(async () => {
		const authModule = await import("../../service/auth");
		AuthServiceCtor = authModule.AuthService;
	});

	beforeEach(() => {
		mock.restore();
		authService = new AuthServiceCtor(mockDb);
	});

	it("should be defined", () => {
		expect(authService).toBeDefined();
	});
});
