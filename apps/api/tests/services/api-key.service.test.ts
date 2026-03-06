import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("@drivebase/utils/server/api-key", () => ({
	generateApiKey: mock().mockReturnValue({
		fullKey: "drv_abc123def456abc123def456abc123def456abc1",
		keyHash: "a".repeat(64),
		keyPrefix: "drv_abc123de",
	}),
	hashApiKey: mock((key: string) => `hash_of_${key}`),
}));

mock.module("@drivebase/db", () => ({
	apiKeys: { id: "id", keyHash: "key_hash" },
	users: { id: "id", email: "email", role: "role" },
}));

import { createApiKey } from "../../service/api-key/mutation/create-api-key";
import { validateApiKey } from "../../service/api-key/shared/validate-api-key";

// ---------------------------------------------------------------------------
// DB mock helpers
// ---------------------------------------------------------------------------

type DbMock = {
	insert: ReturnType<typeof mock>;
	values: ReturnType<typeof mock>;
	returning: ReturnType<typeof mock>;
	select: ReturnType<typeof mock>;
	from: ReturnType<typeof mock>;
	where: ReturnType<typeof mock>;
	limit: ReturnType<typeof mock>;
	then: ReturnType<typeof mock>;
	innerJoin: ReturnType<typeof mock>;
	update: ReturnType<typeof mock>;
	set: ReturnType<typeof mock>;
	catch: ReturnType<typeof mock>;
};

function createDbMock(): DbMock {
	const db: any = {
		insert: mock(),
		values: mock(),
		returning: mock(),
		select: mock(),
		from: mock(),
		where: mock(),
		limit: mock(),
		then: mock(),
		innerJoin: mock(),
		update: mock(),
		set: mock(),
		catch: mock(),
	};

	// Fluent chaining
	db.insert.mockReturnValue(db);
	db.values.mockReturnValue(db);
	db.select.mockReturnValue(db);
	db.from.mockReturnValue(db);
	db.where.mockReturnValue(db);
	db.innerJoin.mockReturnValue(db);
	db.limit.mockReturnValue(db);
	db.update.mockReturnValue(db);
	db.set.mockReturnValue(db);
	db.catch.mockReturnValue(undefined);

	return db;
}

// ---------------------------------------------------------------------------
// createApiKey
// ---------------------------------------------------------------------------

describe("createApiKey", () => {
	let db: DbMock;

	const baseKey = {
		id: "key-1",
		name: "Test Key",
		description: null,
		keyHash: "a".repeat(64),
		keyPrefix: "drv_abc123de",
		scopes: ["read"],
		providerScopes: null,
		userId: "user-1",
		expiresAt: null,
		lastUsedAt: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		mock.restore();
		db = createDbMock();
	});

	it("creates a key with no provider scopes when not provided", async () => {
		db.returning.mockResolvedValue([baseKey]);

		const result = await createApiKey(db as any, "user-1", {
			name: "Test Key",
			scopes: ["read"],
		});

		expect(result.apiKey).toEqual(baseKey);
		expect(result.fullKey).toBe("drv_abc123def456abc123def456abc123def456abc1");
		const valuesCall = db.values.mock.calls[0]?.[0];
		expect(valuesCall.providerScopes).toBeNull();
	});

	it("creates a key with empty providerScopes array treated as null", async () => {
		db.returning.mockResolvedValue([baseKey]);

		await createApiKey(db as any, "user-1", {
			name: "Test Key",
			scopes: ["read"],
			providerScopes: [],
		});

		const valuesCall = db.values.mock.calls[0]?.[0];
		expect(valuesCall.providerScopes).toBeNull();
	});

	it("normalizes missing basePath to '/'", async () => {
		db.returning.mockResolvedValue([
			{ ...baseKey, providerScopes: [{ providerId: "p-1", basePath: "/" }] },
		]);

		await createApiKey(db as any, "user-1", {
			name: "Test Key",
			scopes: ["read"],
			providerScopes: [{ providerId: "p-1", basePath: null }],
		});

		const valuesCall = db.values.mock.calls[0]?.[0];
		expect(valuesCall.providerScopes).toEqual([
			{ providerId: "p-1", basePath: "/" },
		]);
	});

	it("normalizes empty string basePath to '/'", async () => {
		db.returning.mockResolvedValue([baseKey]);

		await createApiKey(db as any, "user-1", {
			name: "Test Key",
			scopes: ["read"],
			providerScopes: [{ providerId: "p-1", basePath: "   " }],
		});

		const valuesCall = db.values.mock.calls[0]?.[0];
		expect(valuesCall.providerScopes[0].basePath).toBe("/");
	});

	it("preserves explicit basePath when provided", async () => {
		db.returning.mockResolvedValue([baseKey]);

		await createApiKey(db as any, "user-1", {
			name: "Test Key",
			scopes: ["read"],
			providerScopes: [{ providerId: "p-2", basePath: "/documents" }],
		});

		const valuesCall = db.values.mock.calls[0]?.[0];
		expect(valuesCall.providerScopes[0].basePath).toBe("/documents");
	});

	it("stores multiple provider scopes", async () => {
		db.returning.mockResolvedValue([baseKey]);

		await createApiKey(db as any, "user-1", {
			name: "Test Key",
			scopes: ["read"],
			providerScopes: [
				{ providerId: "p-1", basePath: "/" },
				{ providerId: "p-2", basePath: "/photos" },
			],
		});

		const valuesCall = db.values.mock.calls[0]?.[0];
		expect(valuesCall.providerScopes).toHaveLength(2);
		expect(valuesCall.providerScopes[1].basePath).toBe("/photos");
	});

	it("throws ValidationError for empty name", async () => {
		await expect(
			createApiKey(db as any, "user-1", { name: "  ", scopes: ["read"] }),
		).rejects.toThrow("API key name is required");
	});

	it("throws ValidationError for invalid scopes", async () => {
		await expect(
			createApiKey(db as any, "user-1", {
				name: "Test Key",
				scopes: ["superadmin"],
			}),
		).rejects.toThrow("Invalid scopes");
	});

	it("throws ValidationError for empty scopes", async () => {
		await expect(
			createApiKey(db as any, "user-1", { name: "Test Key", scopes: [] }),
		).rejects.toThrow("Invalid scopes");
	});
});

// ---------------------------------------------------------------------------
// validateApiKey — providerScopes propagation
// ---------------------------------------------------------------------------

describe("validateApiKey — providerScopes", () => {
	let db: DbMock;

	beforeEach(() => {
		mock.restore();
		db = createDbMock();
	});

	it("returns null providerScopes when the key has none", async () => {
		db.limit.mockImplementation(() => ({
			then: (cb: any) =>
				Promise.resolve(
					cb([
						{
							id: "key-1",
							scopes: ["read"],
							providerScopes: null,
							isActive: true,
							expiresAt: null,
							userId: "user-1",
							email: "user@example.com",
							role: "member",
						},
					]),
				),
		}));

		const result = await validateApiKey(db as any, "drv_testkey");
		expect(result).not.toBeNull();
		expect(result!.providerScopes).toBeNull();
	});

	it("returns providerScopes from the DB row", async () => {
		const storedScopes = [
			{ providerId: "p-1", basePath: "/" },
			{ providerId: "p-2", basePath: "/docs" },
		];

		db.limit.mockImplementation(() => ({
			then: (cb: any) =>
				Promise.resolve(
					cb([
						{
							id: "key-1",
							scopes: ["read"],
							providerScopes: storedScopes,
							isActive: true,
							expiresAt: null,
							userId: "user-1",
							email: "user@example.com",
							role: "member",
						},
					]),
				),
		}));

		const result = await validateApiKey(db as any, "drv_testkey");
		expect(result).not.toBeNull();
		expect(result!.providerScopes).toEqual(storedScopes);
	});

	it("returns null for inactive key", async () => {
		db.limit.mockImplementation(() => ({
			then: (cb: any) =>
				Promise.resolve(
					cb([
						{
							id: "key-1",
							scopes: ["read"],
							providerScopes: null,
							isActive: false,
							expiresAt: null,
							userId: "user-1",
							email: "user@example.com",
							role: "member",
						},
					]),
				),
		}));

		const result = await validateApiKey(db as any, "drv_testkey");
		expect(result).toBeNull();
	});

	it("returns null for expired key", async () => {
		db.limit.mockImplementation(() => ({
			then: (cb: any) =>
				Promise.resolve(
					cb([
						{
							id: "key-1",
							scopes: ["read"],
							providerScopes: null,
							isActive: true,
							expiresAt: new Date(Date.now() - 1000),
							userId: "user-1",
							email: "user@example.com",
							role: "member",
						},
					]),
				),
		}));

		const result = await validateApiKey(db as any, "drv_testkey");
		expect(result).toBeNull();
	});

	it("returns null when key not found", async () => {
		db.limit.mockImplementation(() => ({
			then: (cb: any) => Promise.resolve(cb([])),
		}));

		const result = await validateApiKey(db as any, "drv_testkey");
		expect(result).toBeNull();
	});
});
