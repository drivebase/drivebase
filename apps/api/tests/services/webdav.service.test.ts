import { beforeEach, describe, expect, it, mock } from "bun:test";

const verifyPassword = mock();
const getWebDavCredentialByUsername = mock();

mock.module("../../utils/auth/password", () => ({
	verifyPassword,
}));

mock.module("../../service/webdav/query", () => ({
	getWebDavCredentialByUsername,
}));

import { authenticateWebDavCredential } from "../../service/webdav/auth";
import { normalizeWebDavProviderScopes } from "../../service/webdav/shared/scope";

describe("normalizeWebDavProviderScopes", () => {
	it("returns null when no provider restriction is configured", () => {
		expect(normalizeWebDavProviderScopes(null)).toBeNull();
		expect(normalizeWebDavProviderScopes([])).toBeNull();
	});

	it("normalizes blank values to root", () => {
		expect(
			normalizeWebDavProviderScopes([{ providerId: "p1", basePath: "   " }]),
		).toEqual([{ providerId: "p1", basePath: "/" }]);
	});

	it("rejects duplicate providers", () => {
		expect(() =>
			normalizeWebDavProviderScopes([
				{ providerId: "p1", basePath: "/" },
				{ providerId: "p1", basePath: "/docs" },
			]),
		).toThrow("Duplicate provider scope");
	});

	it("rejects traversal in base paths", () => {
		expect(() =>
			normalizeWebDavProviderScopes([
				{ providerId: "p1", basePath: "/docs/../secret" },
			]),
		).toThrow("Invalid base path");
	});
});

describe("authenticateWebDavCredential", () => {
	const db = {
		update: mock(),
		set: mock(),
		where: mock(),
		catch: mock(),
	};

	beforeEach(() => {
		verifyPassword.mockReset();
		getWebDavCredentialByUsername.mockReset();
		db.update.mockReset();
		db.set.mockReset();
		db.where.mockReset();
		db.catch.mockReset();
		db.update.mockReturnValue(db);
		db.set.mockReturnValue(db);
		db.where.mockReturnValue(db);
		db.catch.mockReturnValue(undefined);
	});

	it("returns a principal when the credential is valid", async () => {
		getWebDavCredentialByUsername.mockResolvedValue({
			credentialId: "cred-1",
			workspaceId: "ws-1",
			name: "Mac Finder access",
			username: "alice.webdav",
			passwordHash: "hash",
			providerScopes: [{ providerId: "provider-1", basePath: "/docs" }],
			isActive: true,
		});
		verifyPassword.mockResolvedValue(true);

		const result = await authenticateWebDavCredential(
			db as any,
			"alice.webdav",
			"secret",
		);

		expect(result).toEqual({
			credentialId: "cred-1",
			workspaceId: "ws-1",
			name: "Mac Finder access",
			username: "alice.webdav",
			providerScopes: [{ providerId: "provider-1", basePath: "/docs" }],
		});
		expect(db.update).toHaveBeenCalled();
	});

	it("returns null scopes when the credential allows all providers", async () => {
		getWebDavCredentialByUsername.mockResolvedValue({
			credentialId: "cred-1",
			workspaceId: "ws-1",
			name: "Mac Finder access",
			username: "alice.webdav",
			passwordHash: "hash",
			providerScopes: null,
			isActive: true,
		});
		verifyPassword.mockResolvedValue(true);

		const result = await authenticateWebDavCredential(
			db as any,
			"alice.webdav",
			"secret",
		);

		expect(result.providerScopes).toBeNull();
	});

	it("rejects inactive credentials", async () => {
		getWebDavCredentialByUsername.mockResolvedValue({
			credentialId: "cred-1",
			workspaceId: "ws-1",
			name: "Mac Finder access",
			username: "alice.webdav",
			passwordHash: "hash",
			providerScopes: [{ providerId: "provider-1", basePath: "/" }],
			isActive: false,
		});

		try {
			await authenticateWebDavCredential(db as any, "alice.webdav", "secret");
			throw new Error("Expected authenticateWebDavCredential to throw");
		} catch (error) {
			expect(error instanceof Error ? error.message : String(error)).toContain(
				"credentials",
			);
		}
	});
});
